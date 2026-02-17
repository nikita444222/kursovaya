const express = require('express')
const db = require('../utils/db')
const { requireAuth } = require('../middleware/auth')
const { clean } = require('../utils/sanitize')

const router = express.Router()

// Создание поста: форма
router.get('/new', requireAuth, async (req, res, next) => {
  try {
    const [categories] = await db.query('SELECT id, name FROM categories ORDER BY name')
    const [sections] = await db.query(
      'SELECT s.id, s.name, s.category_id, c.name AS category_name FROM sections s JOIN categories c ON c.id=s.category_id ORDER BY c.name, s.name'
    )
    res.render('posts/form', {
      title: 'Создать пост',
      mode: 'create',
      categories,
      sections,
      post: { title: '', content: '', section_id: null },
    })
  } catch (e) {
    next(e)
  }
})

router.post('/new', requireAuth, async (req, res, next) => {
  try {
    // Создание поста
    const title = clean(req.body.title)
    const content = clean(req.body.content)
    const sectionId = Number(req.body.section_id || 0)

    if (!title || !content || !sectionId) {
      req.flash('error', 'Заполните заголовок, текст и выберите раздел')
      return res.redirect('/posts/new')
    }

    const [sec] = await db.query('SELECT id FROM sections WHERE id=? LIMIT 1', [sectionId])
    if (!sec.length) {
      req.flash('error', 'Раздел не найден')
      return res.redirect('/posts/new')
    }

    const [result] = await db.query(
      'INSERT INTO posts (user_id, section_id, title, content) VALUES (?,?,?,?)',
      [req.session.user.id, sectionId, title, content]
    )

    req.flash('success', 'Пост опубликован')
    res.redirect(`/posts/${result.insertId}`)
  } catch (e) {
    next(e)
  }
})

// Просмотр поста + комментарии
router.get('/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id)
    const userId = req.session.user?.id || null

    const savedJoin = userId
      ? 'LEFT JOIN saved_posts sp ON sp.post_id=p.id AND sp.user_id=' + db.escape(userId)
      : 'LEFT JOIN saved_posts sp ON 1=0'

    const [rows] = await db.query(
      `SELECT
         p.id, p.title, p.content, p.created_at,
         u.id AS author_id, u.username AS author_username, u.avatar_url AS author_avatar,
         s.id AS section_id, s.name AS section_name,
         c.id AS category_id, c.name AS category_name,
         (sp.user_id IS NOT NULL) AS is_saved
       FROM posts p
       JOIN users u ON u.id=p.user_id
       JOIN sections s ON s.id=p.section_id
       JOIN categories c ON c.id=s.category_id
       ${savedJoin}
       WHERE p.id=? LIMIT 1`,
      [id]
    )

    if (!rows.length) return res.status(404).render('errors/404', { title: 'Пост не найден' })
    const post = rows[0]

    const [comments] = await db.query(
      `SELECT cm.id, cm.content, cm.created_at,
              u.id AS user_id, u.username, u.avatar_url
       FROM comments cm
       JOIN users u ON u.id=cm.user_id
       WHERE cm.post_id=?
       ORDER BY cm.created_at ASC`,
      [id]
    )

    res.render('posts/view', { title: post.title, post, comments })
  } catch (e) {
    next(e)
  }
})

// Комментарий
router.post('/:id/comments', requireAuth, async (req, res, next) => {
  try {
    // Добавление комментария
    const id = Number(req.params.id)
    const content = clean(req.body.content)
    if (!content) {
      req.flash('error', 'Комментарий не может быть пустым')
      return res.redirect(`/posts/${id}`)
    }

    await db.query('INSERT INTO comments (post_id, user_id, content) VALUES (?,?,?)', [
      id,
      req.session.user.id,
      content,
    ])

    req.flash('success', 'Комментарий добавлен')
    res.redirect(`/posts/${id}#comments`)
  } catch (e) {
    next(e)
  }
})

// Удаление своего комментария
router.post('/:postId/comments/:commentId/delete', requireAuth, async (req, res, next) => {
  try {
    // Удаление комментария
    const postId = Number(req.params.postId)
    const commentId = Number(req.params.commentId)

    const [rows] = await db.query('SELECT id, user_id FROM comments WHERE id=? AND post_id=? LIMIT 1', [
      commentId,
      postId,
    ])

    if (!rows.length) {
      req.flash('error', 'Комментарий не найден')
      return res.redirect(`/posts/${postId}`)
    }

    if (rows[0].user_id !== req.session.user.id) {
      req.flash('error', 'Нельзя удалить чужой комментарий')
      return res.redirect(`/posts/${postId}`)
    }

    await db.query('DELETE FROM comments WHERE id=?', [commentId])
    req.flash('success', 'Комментарий удалён')
    res.redirect(`/posts/${postId}#comments`)
  } catch (e) {
    next(e)
  }
})

// Сохранить/убрать из сохраненных
router.post('/:id/save', requireAuth, async (req, res, next) => {
  try {
    // Переключение избранного
    const postId = Number(req.params.id)
    const userId = req.session.user.id

    const [rows] = await db.query('SELECT 1 FROM saved_posts WHERE user_id=? AND post_id=? LIMIT 1', [
      userId,
      postId,
    ])

    if (rows.length) {
      await db.query('DELETE FROM saved_posts WHERE user_id=? AND post_id=?', [userId, postId])
      req.flash('success', 'Убрано из сохранённых')
    } else {
      await db.query('INSERT IGNORE INTO saved_posts (user_id, post_id) VALUES (?,?)', [userId, postId])
      req.flash('success', 'Добавлено в сохранённые')
    }

    const back = req.get('referer') || '/'
    res.redirect(back)
  } catch (e) {
    next(e)
  }
})

// Редактирование поста: форма
router.get('/:id/edit', requireAuth, async (req, res, next) => {
  try {
    const id = Number(req.params.id)
    const [posts] = await db.query('SELECT id, user_id, section_id, title, content FROM posts WHERE id=? LIMIT 1', [
      id,
    ])
    if (!posts.length) return res.status(404).render('errors/404', { title: 'Пост не найден' })

    const post = posts[0]
    if (post.user_id !== req.session.user.id) {
      req.flash('error', 'Нельзя редактировать чужой пост')
      return res.redirect(`/posts/${id}`)
    }

    const [categories] = await db.query('SELECT id, name FROM categories ORDER BY name')
    const [sections] = await db.query(
      'SELECT s.id, s.name, s.category_id, c.name AS category_name FROM sections s JOIN categories c ON c.id=s.category_id ORDER BY c.name, s.name'
    )

    res.render('posts/form', {
      title: 'Редактировать пост',
      mode: 'edit',
      categories,
      sections,
      post,
    })
  } catch (e) {
    next(e)
  }
})

router.post('/:id/edit', requireAuth, async (req, res, next) => {
  try {
    // Редактирование поста
    const id = Number(req.params.id)
    const title = clean(req.body.title)
    const content = clean(req.body.content)
    const sectionId = Number(req.body.section_id || 0)

    const [posts] = await db.query('SELECT id, user_id FROM posts WHERE id=? LIMIT 1', [id])
    if (!posts.length) return res.status(404).render('errors/404', { title: 'Пост не найден' })
    if (posts[0].user_id !== req.session.user.id) {
      req.flash('error', 'Нельзя редактировать чужой пост')
      return res.redirect(`/posts/${id}`)
    }

    if (!title || !content || !sectionId) {
      req.flash('error', 'Заполните заголовок, текст и выберите раздел')
      return res.redirect(`/posts/${id}/edit`)
    }

    await db.query('UPDATE posts SET section_id=?, title=?, content=? WHERE id=?', [
      sectionId,
      title,
      content,
      id,
    ])

    req.flash('success', 'Пост обновлён')
    res.redirect(`/posts/${id}`)
  } catch (e) {
    next(e)
  }
})

// Удаление поста
router.post('/:id/delete', requireAuth, async (req, res, next) => {
  try {
    // Удаление поста
    const id = Number(req.params.id)
    const [posts] = await db.query('SELECT id, user_id FROM posts WHERE id=? LIMIT 1', [id])
    if (!posts.length) {
      req.flash('error', 'Пост не найден')
      return res.redirect('/my')
    }

    // Пользователь может удалить только свой пост, админ — любой
    const isOwner = posts[0].user_id === req.session.user.id
    const isAdmin = req.session.user.role === 'admin'
    if (!isOwner && !isAdmin) {
      req.flash('error', 'Нельзя удалить чужой пост')
      return res.redirect(`/posts/${id}`)
    }

    await db.query('DELETE FROM posts WHERE id=?', [id])
    req.flash('success', 'Пост удалён')
    res.redirect('/my')
  } catch (e) {
    next(e)
  }
})

module.exports = router
