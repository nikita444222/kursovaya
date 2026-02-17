require('dotenv').config()

const path = require('path')
const express = require('express')
const session = require('express-session')
const cookieParser = require('cookie-parser')
const flash = require('connect-flash')
const helmet = require('helmet')
const morgan = require('morgan')
const rateLimit = require('express-rate-limit')
const methodOverride = require('method-override')

const { injectUser } = require('./src/middleware/auth')

const indexRoutes = require('./src/routes/index')
const authRoutes = require('./src/routes/auth')
const postRoutes = require('./src/routes/posts')
const myRoutes = require('./src/routes/my')
const savedRoutes = require('./src/routes/saved')
const profileRoutes = require('./src/routes/profile')
const usersRoutes = require('./src/routes/users')
const adminRoutes = require('./src/routes/admin')

const app = express()

app.set('view engine', 'ejs')
app.set('views', path.join(__dirname, 'src', 'views'))

// Базовая безопасность HTTP заголовков
app.use(helmet({ contentSecurityPolicy: false }))
app.use(morgan('dev'))

// Лимит на запросы
app.use(
  rateLimit({
    windowMs: 60 * 1000,
    limit: 240,
    standardHeaders: true,
    legacyHeaders: false,
  })
)

app.use(express.urlencoded({ extended: true }))
app.use(express.json())
app.use(cookieParser())
app.use(methodOverride('_method'))

// Сессии
app.use(
  session({
    name: 'doggo.sid',
    secret: process.env.SESSION_SECRET || 'dev_secret',
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 1000 * 60 * 60 * 24 * 7,
    },
  })
)

app.use(flash())
app.use(injectUser)

app.use('/css', express.static(path.join(__dirname, 'public', 'css')))
app.use('/js', express.static(path.join(__dirname, 'public', 'js')))
app.use('/img', express.static(path.join(__dirname, 'public', 'img')))
app.use('/uploads', express.static(path.join(__dirname, 'public', 'uploads')))

// Роуты
app.use('/', indexRoutes)
app.use('/auth', authRoutes)
app.use('/posts', postRoutes)
app.use('/my', myRoutes)
app.use('/saved', savedRoutes)
app.use('/profile', profileRoutes)
app.use('/users', usersRoutes)
app.use('/admin', adminRoutes)

// 404
app.use((req, res) => {
  res.status(404).render('errors/404', { title: 'Страница не найдена' })
})

// Обработчик ошибок
app.use((err, req, res, next) => {
  console.error(err)
  res.status(500).render('errors/500', { title: 'Ошибка сервера', error: err })
})

const port = Number(process.env.PORT || 3000)
app.listen(port, () => {
  console.log(`DoggoForum listening on http://localhost:${port}`)
})
