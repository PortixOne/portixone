export class AuthService {
  validate(providedKey: string | undefined, expectedKey: string): boolean {
    return typeof providedKey === 'string' && providedKey.length > 0 && providedKey === expectedKey;
  }
}
