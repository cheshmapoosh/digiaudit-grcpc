import { AuthApiRepo } from "../infra/auth.api.repo";
export type { AuthMeResponse } from "../domain/auth.model";
export const authService = new AuthApiRepo();
