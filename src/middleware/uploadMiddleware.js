import multer from "multer";

const storage = multer.memoryStorage();

const imageFileFilter = (_req, file, callback) => {
  if (!file.mimetype || !file.mimetype.startsWith("image/")) {
    return callback(new Error("Only image files are allowed"));
  }
  return callback(null, true);
};

export const upload = multer({
  storage,
  fileFilter: imageFileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
});
