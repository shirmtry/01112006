// src/utils/time.js

export function getVietnamTime() {
  const now = new Date();
  const vietnamOffset = 7 * 60; // GMT+7
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  return new Date(utc + vietnamOffset * 60000);
}

export function formatTimeVN(date) {
  return new Date(date).toLocaleString("vi-VN", {
    hour12: false,
    timeZone: "Asia/Ho_Chi_Minh",
  });
}
