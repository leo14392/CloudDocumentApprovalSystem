
import argon2 from "argon2";
import { pool } from "../config/database.js";
import type { AuthenticatedUser } from "../types/auth.js";

interface LoginAccount extends AuthenticatedUser {
  passwordHash: string;
  studentNumber: string | null;
  college: string | null;
  department: string | null;
  program: string | null;
  yearLevel: number | null;
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
        u.given_name AS "givenName",
        u.middle_name AS "middleName",
        u.family_name AS "familyName",

        sp.student_number AS "studentNumber",
        sp.college,
        sp.department,
        sp.program,
        sp.year_level AS "yearLevel",

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

    LEFT JOIN student_profiles sp
        ON sp.user_id = u.user_id

    WHERE LOWER(u.email) = LOWER($1)
      AND u.is_active = TRUE

    GROUP BY u.user_id, sp.student_profile_id
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
    givenName: account.givenName,
    middleName: account.middleName,
    familyName: account.familyName,
    roles: account.roles,

    studentNumber: account.studentNumber,
    college: account.college,
    department: account.department,
    program: account.program,
    yearLevel: account.yearLevel
};
}
