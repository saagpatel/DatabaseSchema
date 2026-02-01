use base64::{engine::general_purpose::STANDARD as BASE64, Engine};
use ring::{aead, pbkdf2, rand as ring_rand, rand::SecureRandom};
use std::num::NonZeroU32;

use crate::error::AppError;

const PBKDF2_ITERATIONS: u32 = 600_000;
const NONCE_LEN: usize = 12;

/// Derive a 256-bit encryption key from machine identifier + salt using PBKDF2
pub fn derive_key(machine_id: &str, salt: &[u8]) -> [u8; 32] {
    let mut key = [0u8; 32];
    pbkdf2::derive(
        pbkdf2::PBKDF2_HMAC_SHA256,
        NonZeroU32::new(PBKDF2_ITERATIONS).unwrap(),
        salt,
        machine_id.as_bytes(),
        &mut key,
    );
    key
}

/// Generate a random 32-byte salt
pub fn generate_salt() -> Result<Vec<u8>, AppError> {
    let rng = ring_rand::SystemRandom::new();
    let mut salt = vec![0u8; 32];
    rng.fill(&mut salt)
        .map_err(|_| AppError::Encryption("Failed to generate random salt".into()))?;
    Ok(salt)
}

/// Encrypt plaintext using AES-256-GCM. Returns base64(nonce || ciphertext || tag).
pub fn encrypt(key: &[u8; 32], plaintext: &str) -> Result<String, AppError> {
    let unbound_key = aead::UnboundKey::new(&aead::AES_256_GCM, key)
        .map_err(|_| AppError::Encryption("Failed to create encryption key".into()))?;
    let sealing_key = aead::LessSafeKey::new(unbound_key);

    let rng = ring_rand::SystemRandom::new();
    let mut nonce_bytes = [0u8; NONCE_LEN];
    rng.fill(&mut nonce_bytes)
        .map_err(|_| AppError::Encryption("Failed to generate nonce".into()))?;
    let nonce = aead::Nonce::assume_unique_for_key(nonce_bytes);

    let mut in_out = plaintext.as_bytes().to_vec();
    sealing_key
        .seal_in_place_append_tag(nonce, aead::Aad::empty(), &mut in_out)
        .map_err(|_| AppError::Encryption("Encryption failed".into()))?;

    // Prepend nonce to ciphertext+tag
    let mut result = Vec::with_capacity(NONCE_LEN + in_out.len());
    result.extend_from_slice(&nonce_bytes);
    result.extend_from_slice(&in_out);

    Ok(BASE64.encode(&result))
}

/// Decrypt base64-encoded ciphertext (nonce || ciphertext || tag) using AES-256-GCM.
pub fn decrypt(key: &[u8; 32], encoded: &str) -> Result<String, AppError> {
    let data = BASE64
        .decode(encoded)
        .map_err(|e| AppError::Encryption(format!("Base64 decode failed: {e}")))?;

    if data.len() < NONCE_LEN + aead::AES_256_GCM.tag_len() {
        return Err(AppError::Encryption("Ciphertext too short".into()));
    }

    let (nonce_bytes, ciphertext) = data.split_at(NONCE_LEN);
    let nonce = aead::Nonce::try_assume_unique_for_key(nonce_bytes)
        .map_err(|_| AppError::Encryption("Invalid nonce".into()))?;

    let unbound_key = aead::UnboundKey::new(&aead::AES_256_GCM, key)
        .map_err(|_| AppError::Encryption("Failed to create decryption key".into()))?;
    let opening_key = aead::LessSafeKey::new(unbound_key);

    let mut in_out = ciphertext.to_vec();
    let plaintext = opening_key
        .open_in_place(nonce, aead::Aad::empty(), &mut in_out)
        .map_err(|_| AppError::Encryption("Decryption failed".into()))?;

    String::from_utf8(plaintext.to_vec())
        .map_err(|e| AppError::Encryption(format!("UTF-8 decode failed: {e}")))
}

/// Get machine identifier (hostname) for key derivation
pub fn get_machine_id() -> String {
    hostname::get()
        .map(|h| h.to_string_lossy().to_string())
        .unwrap_or_else(|_| "dbviz-default-host".to_string())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_encrypt_decrypt_roundtrip() {
        let salt = generate_salt().unwrap();
        let key = derive_key("test-machine", &salt);

        let plaintext = "my_secret_password_123!";
        let encrypted = encrypt(&key, plaintext).unwrap();

        // Encrypted text should be different from plaintext
        assert_ne!(encrypted, plaintext);

        let decrypted = decrypt(&key, &encrypted).unwrap();
        assert_eq!(decrypted, plaintext);
    }

    #[test]
    fn test_different_keys_cannot_decrypt() {
        let salt1 = generate_salt().unwrap();
        let salt2 = generate_salt().unwrap();
        let key1 = derive_key("machine1", &salt1);
        let key2 = derive_key("machine2", &salt2);

        let encrypted = encrypt(&key1, "secret").unwrap();
        let result = decrypt(&key2, &encrypted);
        assert!(result.is_err());
    }

    #[test]
    fn test_empty_string_roundtrip() {
        let salt = generate_salt().unwrap();
        let key = derive_key("test", &salt);

        let encrypted = encrypt(&key, "").unwrap();
        let decrypted = decrypt(&key, &encrypted).unwrap();
        assert_eq!(decrypted, "");
    }

    #[test]
    fn test_key_derivation_deterministic() {
        let salt = vec![1u8; 32];
        let key1 = derive_key("same-machine", &salt);
        let key2 = derive_key("same-machine", &salt);
        assert_eq!(key1, key2);
    }

    #[test]
    fn test_unicode_roundtrip() {
        let salt = generate_salt().unwrap();
        let key = derive_key("test", &salt);

        let plaintext = "p\u{00e4}ssw\u{00f6}rd \u{1f512}";
        let encrypted = encrypt(&key, plaintext).unwrap();
        let decrypted = decrypt(&key, &encrypted).unwrap();
        assert_eq!(decrypted, plaintext);
    }

    #[test]
    fn test_long_password_roundtrip() {
        let salt = generate_salt().unwrap();
        let key = derive_key("test", &salt);

        let plaintext = "a".repeat(10_000);
        let encrypted = encrypt(&key, &plaintext).unwrap();
        let decrypted = decrypt(&key, &encrypted).unwrap();
        assert_eq!(decrypted, plaintext);
    }

    #[test]
    fn test_same_plaintext_different_ciphertext() {
        let salt = generate_salt().unwrap();
        let key = derive_key("test", &salt);

        let enc1 = encrypt(&key, "same").unwrap();
        let enc2 = encrypt(&key, "same").unwrap();
        // Different nonces should produce different ciphertexts
        assert_ne!(enc1, enc2);

        // But both should decrypt to the same value
        assert_eq!(decrypt(&key, &enc1).unwrap(), "same");
        assert_eq!(decrypt(&key, &enc2).unwrap(), "same");
    }

    #[test]
    fn test_invalid_base64_decrypt() {
        let salt = generate_salt().unwrap();
        let key = derive_key("test", &salt);
        let result = decrypt(&key, "not-valid-base64!@#$");
        assert!(result.is_err());
    }

    #[test]
    fn test_truncated_ciphertext_decrypt() {
        let salt = generate_salt().unwrap();
        let key = derive_key("test", &salt);
        // Too short to contain nonce + tag
        let short = base64::engine::general_purpose::STANDARD.encode(&[0u8; 5]);
        let result = decrypt(&key, &short);
        assert!(result.is_err());
    }
}
