import fs from 'node:fs';

const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjIsImVtYWlsIjoidmFuYTEyM0BnbWFpbC5jb20iLCJuYW1lIjoiTmd1eT9uIFY_biBBIiwicm9sZSI6ImVtcGxveWVlIiwiaWF0IjoxNzg4MTY4NzEyLCJleHAiOjE3ODg3NzM1MTJ9.mQJIWXzdRVJXV7OnJIBFeffYxoWpy4efTF1XJdDH7U0';
const filePath = 'C:/xampp/htdocs/dashboard/fpoly/DATN/tmp/placeholder.png';
const fileBytes = fs.readFileSync(filePath);

const formData = new FormData();
formData.append('upload', new Blob([fileBytes], { type: 'image/png' }), 'test.png');

const res = await fetch('http://localhost:4000/api/admin/upload/ckeditor-image', {
  method: 'POST',
  headers: { Authorization: `Bearer ${token}` },
  body: formData,
});

console.log('STATUS', res.status);
const text = await res.text();
console.log(text);
