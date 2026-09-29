import Ajv, { type ErrorObject } from "ajv";
import addFormats from "ajv-formats";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import type { CorpusData } from "./types";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CORPUS_DOCS_DIR = path.resolve(
  __dirname,
  "../../../docs/security/fuzz-matrix-2026-09-24",
);

export interface SchemaValidationResult {
  valid: boolean;
  errors: Array<{
    instancePath: string;
    schemaPath: string;
    keyword: string;
    message?: string;
    params: Record<string, unknown>;
  }>;
}

function createStrictAjv(): Ajv {
  // Requirement 2: coercion=false, removeAdditional=false, useDefaults=false
  const ajv = new Ajv({
    coerceTypes: false,
    removeAdditional: false,
    useDefaults: false,
    allErrors: true,
  });
  addFormats(ajv);
  return ajv;
}

export function loadCorpusSchema(): object {
  const schemaPath = path.join(CORPUS_DOCS_DIR, "corpus.schema.json");
  return JSON.parse(fs.readFileSync(schemaPath, "utf-8"));
}

export function loadPayloadContractsSchema(): object {
  const schemaPath = path.join(
    CORPUS_DOCS_DIR,
    "payload-contracts.schema.json",
  );
  return JSON.parse(fs.readFileSync(schemaPath, "utf-8"));
}

export function loadCorpus(): CorpusData {
  const corpusPath = path.join(CORPUS_DOCS_DIR, "corpus.json");
  return JSON.parse(fs.readFileSync(corpusPath, "utf-8"));
}

export function validateCorpusAgainstSchema(
  corpus: unknown = loadCorpus(),
): SchemaValidationResult {
  const ajv = createStrictAjv();
  const schema = loadCorpusSchema();
  const validate = ajv.compile(schema);
  const valid = validate(corpus);

  return {
    valid: Boolean(valid),
    errors: (validate.errors || []).map((err: ErrorObject) => ({
      instancePath: err.instancePath,
      schemaPath: err.schemaPath,
      keyword: err.keyword,
      message: err.message,
      params: err.params as Record<string, unknown>,
    })),
  };
}

export function validatePayloadContract(
  kind: string,
  input: unknown,
): SchemaValidationResult {
  const ajv = createStrictAjv();
  const schema = loadPayloadContractsSchema();
  const validate = ajv.compile(schema);
  const payloadToTest = { kind, input };
  const valid = validate(payloadToTest);

  return {
    valid: Boolean(valid),
    errors: (validate.errors || []).map((err: ErrorObject) => ({
      instancePath: err.instancePath,
      schemaPath: err.schemaPath,
      keyword: err.keyword,
      message: err.message,
      params: err.params as Record<string, unknown>,
    })),
  };
}
