import { describe, it, expect, beforeEach } from "vitest";
import { useSchemaStore } from "./schemaStore";
import type { SchemaInfo } from "@/types/schema";

const mockSchema: SchemaInfo = {
  schemaName: "public",
  tables: [
    {
      schemaName: "public",
      tableName: "users",
      tableType: "BASE TABLE",
      columns: [
        {
          columnName: "id",
          dataType: "integer",
          isNullable: false,
          isPrimaryKey: true,
          columnDefault: "nextval('users_id_seq')",
          ordinalPosition: 1,
          characterMaximumLength: null,
        },
        {
          columnName: "name",
          dataType: "character varying",
          isNullable: false,
          isPrimaryKey: false,
          columnDefault: null,
          ordinalPosition: 2,
          characterMaximumLength: 255,
        },
      ],
      indexes: [],
      rowEstimate: 1500,
    },
  ],
  foreignKeys: [],
};

describe("schemaStore", () => {
  beforeEach(() => {
    useSchemaStore.setState({
      schemas: [],
      selectedSchema: null,
      schemaInfo: null,
      loading: false,
      error: null,
      searchQuery: "",
    });
  });

  it("sets schemas list", () => {
    useSchemaStore.getState().setSchemas(["public", "auth"]);
    expect(useSchemaStore.getState().schemas).toEqual(["public", "auth"]);
  });

  it("sets selected schema", () => {
    useSchemaStore.getState().setSelectedSchema("public");
    expect(useSchemaStore.getState().selectedSchema).toBe("public");
  });

  it("sets schema info", () => {
    useSchemaStore.getState().setSchemaInfo(mockSchema);
    const info = useSchemaStore.getState().schemaInfo;
    expect(info?.tables).toHaveLength(1);
    expect(info?.tables[0]?.tableName).toBe("users");
  });

  it("sets search query", () => {
    useSchemaStore.getState().setSearchQuery("user");
    expect(useSchemaStore.getState().searchQuery).toBe("user");
  });

  it("sets loading state", () => {
    useSchemaStore.getState().setLoading(true);
    expect(useSchemaStore.getState().loading).toBe(true);
  });

  it("sets error state", () => {
    useSchemaStore.getState().setError("Not connected");
    expect(useSchemaStore.getState().error).toBe("Not connected");
  });
});
