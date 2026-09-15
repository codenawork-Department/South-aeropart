import "@testing-library/jest-dom/vitest";

process.env.ADMIN_MFA_ENCRYPTION_KEY = "unit_test_only_mfa_encryption_key_32_chars_long";

process.env.ADMIN_SESSION_SECRET = "unit_test_only_admin_session_key_32_chars_long";
