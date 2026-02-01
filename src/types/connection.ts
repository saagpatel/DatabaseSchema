export interface ConnectionInput {
  name: string;
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
  sslMode?: string;
  color?: string;
}

export interface ConnectionDisplay {
  id: string;
  name: string;
  host: string;
  port: number;
  database: string;
  username: string;
  sslMode: string;
  color: string;
  isConnected: boolean;
  createdAt: string;
  updatedAt: string;
}
