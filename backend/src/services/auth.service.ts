import argon2 from "argon2";
import { pool } from "../config/database.js";
import type { AuthenticatedUser } from "../types/auth.js";

interface LoginAccount extends AuthenticatedUser {
  passwordHash: string;
}

export async function authenticateUser(
  email: string,
  password: string
): Promise<AuthenticatedUser | null> {
  const result = await pool.query<LoginAccount>(
    `
    SELECT
      u.user_id::text AS id,
      u.email,
      u.password_hash AS "passwordHash",
      u.first_name AS "firstName",
      u.middle_name AS "middleName",
      u.last_name AS "lastName",
      COALESCE(
        array_agg(r.role_code)
          FILTER (WHERE r.role_code IS NOT NULL),
        ARRAY[]::varchar[]
      ) AS roles
    FROM app_users u
    LEFT JOIN user_roles ur
      ON ur.user_id = u.user_id
    LEFT JOIN roles r
      ON r.role_id = ur.role_id
    WHERE LOWER(u.email) = LOWER($1)
      AND u.is_active = TRUE
    GROUP BY u.user_id
    `,
    [email]
  );

  const account = result.rows[0];

  if (!account) {
    return null;
  }

  let passwordIsValid = false;

  try {
    passwordIsValid = await argon2.verify(
      account.passwordHash,
      password
    );
  } catch {
    return null;
  }

  if (!passwordIsValid) {
    return null;
  }

  return {
    id: account.id,
    email: account.email,
    firstName: account.firstName,
    middleName: account.middleName,
    lastName: account.lastName,
    roles: account.roles
  };
}