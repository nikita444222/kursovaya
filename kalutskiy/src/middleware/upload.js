const fs = require('fs')
const path = require('path')
const multer = require('multer')
const { nanoid } = require('nanoid')

// Настройка загрузки аватаров
const uploadDir = process.env.UPLOAD_DIR || 'public/uploads'
const maxMB = Number(process.env.MAX_AVATAR_MB || 3)

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true })
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase()
    cb(null, `avatar_${nanoid(10)}${ext}`)
  },
})

function fileFilter(req, file, cb) {
  const ok = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.mimetype)
  if (!ok) return cb(new Error('Можно загружать только изображения (jpeg/png/webp/gif)'))
  cb(null, true)
}

const uploadAvatar = multer({
  storage,
  fileFilter,
  limits: { fileSize: maxMB * 1024 * 1024 },
}).single('avatar')

module.exports = { uploadAvatar }
