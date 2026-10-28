// The active scope stays tab-local. Only the last preference is shared across logins.
const KEY = "grcpc.dataset-profile";
const OWNER_KEY = `${KEY}.user`;
let memoryId: string | null = null;
let memoryOwner: string | null = null;

function read(storage: "sessionStorage" | "localStorage", key: string): string | null {
  try { return window[storage].getItem(key); } catch { return null; }
}
function write(storage: "sessionStorage" | "localStorage", key: string, value: string | null) {
  try {
    if (value) window[storage].setItem(key, value);
    else window[storage].removeItem(key);
  } catch { /* Browser storage restrictions must not break profile selection. */ }
}
export const selectedProfileId = () => read("sessionStorage", KEY) ?? memoryId;

export function beginProfileSession(userId: string) {
  const previousOwner = read("sessionStorage", OWNER_KEY) ?? memoryOwner;
  if (previousOwner !== userId) {
    memoryId = null;
    write("sessionStorage", KEY, null);
  }
  memoryOwner = userId;
  write("sessionStorage", OWNER_KEY, userId);
}

export function preferredProfileId(userId: string, allowedIds: string[]): string | null {
  const owner = read("sessionStorage", OWNER_KEY) ?? memoryOwner;
  const current = owner === userId ? selectedProfileId() : null;
  if (current && allowedIds.includes(current)) return current;
  const remembered = read("localStorage", `${KEY}.last.${userId}`);
  return remembered && allowedIds.includes(remembered) ? remembered : allowedIds[0] ?? null;
}

export const storeProfileSelection = (id: string | null) => {
  memoryId = id;
  write("sessionStorage", KEY, id);
  const owner = read("sessionStorage", OWNER_KEY) ?? memoryOwner;
  // Logout clears the active tab, but preserves this user's last valid choice.
  if (id && owner) write("localStorage", `${KEY}.last.${owner}`, id);
};

export function initializeProfileSelection(userId: string, allowedIds: string[]) {
  beginProfileSession(userId);
  storeProfileSelection(preferredProfileId(userId, allowedIds));
}
export function assertRequestProfile(id: string | null) {
  if (id !== selectedProfileId()) throw new DOMException("Dataset selection changed", "AbortError");
}

export function isDatasetUrl(url: string) {
  return /\/api\/(master-data(?:\/|$)|objectives(?:\/|$)|organizations(?:\/|$)|global-controls(?:\/|$)|control-groups(?:\/|$)|dashboard\/master-data|security\/resource-acl)/.test(url);
}
