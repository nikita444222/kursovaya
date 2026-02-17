// Проверка авторизации
function requireAuth(req, res, next) {
  if (!req.session.user) {
    req.flash('error', 'Нужно войти в аккаунт')
    return res.redirect('/auth/login')
  }
  next()
}

// Проверка прав администратора
function requireAdmin(req, res, next) {
  if (!req.session.user) {
    req.flash('error', 'Нужно войти в аккаунт')
    return res.redirect('/auth/login')
  }
  if (req.session.user.role !== 'admin') {
    req.flash('error', 'Недостаточно прав')
    return res.redirect('/')
  }
  next()
}

function injectUser(req, res, next) {
  res.locals.currentUser = req.session.user || null
  res.locals.flash = {
    error: req.flash('error'),
    success: req.flash('success'),
  }
  next()
}

module.exports = { requireAuth, requireAdmin, injectUser }
