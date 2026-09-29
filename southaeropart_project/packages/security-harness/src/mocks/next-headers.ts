export async function cookies() {
  return {
    get: (_name?: string) => undefined,
    set: (_name: string, _val: string, _opt?: unknown) => {},
    delete: (_name: string) => {},
  };
}

export async function headers() {
  return new Headers();
}
