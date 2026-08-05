const DB_NAME = "sweetstar-admin-assets";
const STORE_NAME = "banner-images";

const openDatabase = () => new Promise((resolve, reject) => {
  const request = indexedDB.open(DB_NAME, 1);
  request.onupgradeneeded = () => request.result.createObjectStore(STORE_NAME);
  request.onsuccess = () => resolve(request.result);
  request.onerror = () => reject(request.error);
});

export const saveBannerImage = async (key, image) => {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readwrite");
    transaction.objectStore(STORE_NAME).put(image, key);
    transaction.oncomplete = () => { db.close(); resolve(key); };
    transaction.onerror = () => { db.close(); reject(transaction.error); };
  });
};

export const getBannerImage = async (key) => {
  if (!key) return "";
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const request = db.transaction(STORE_NAME, "readonly").objectStore(STORE_NAME).get(key);
    request.onsuccess = () => { db.close(); resolve(request.result || ""); };
    request.onerror = () => { db.close(); reject(request.error); };
  });
};
