-- Тестовые данные (категории/разделы/пользователи/посты/комментарии/сохранённые)
-- Пароли:
-- admin@doggo.local -> admin123
-- user1@doggo.local..user5@doggo.local -> user123

USE doggo_forum;

-- Категории
INSERT INTO categories (name, slug, sort_order) VALUES
('Здоровье',       'health',       10),
('Дрессировка',    'training',     20),
('Породы',         'breeds',       30),
('Уход и быт',     'care',         40)
ON DUPLICATE KEY UPDATE sort_order=VALUES(sort_order);

-- Разделы
INSERT INTO sections (category_id, name, slug, description, sort_order)
SELECT c.id, s.name, s.slug, s.description, s.sort_order
FROM categories c
JOIN (
  SELECT 'health'  AS cat_slug, 'Питание'              AS name, 'health-nutrition'   AS slug, 'Рационы, аллергии, добавки' AS description, 10 AS sort_order
  UNION ALL SELECT 'health',    'Ветеринария'          , 'health-vet'               , 'Симптомы, препараты, профилактика' , 20
  UNION ALL SELECT 'health',    'Щенки'                , 'health-puppies'           , 'Рост, прививки, адаптация'        , 30

  UNION ALL SELECT 'training',  'Команды и послушание' , 'training-obedience'       , 'База, закрепление, мотивация'     , 10
  UNION ALL SELECT 'training',  'Проблемное поведение' , 'training-behavior'        , 'Лай, страхи, агрессия'            , 20
  UNION ALL SELECT 'training',  'Игры и нагрузка'      , 'training-activity'        , 'Умственные игры, прогулки'        , 30

  UNION ALL SELECT 'breeds',    'Выбор породы'         , 'breeds-choose'            , 'Подбираем под образ жизни'        , 10
  UNION ALL SELECT 'breeds',    'Опыт владельцев'      , 'breeds-experience'        , 'Истории и советы'                 , 20

  UNION ALL SELECT 'care',      'Груминг'              , 'care-grooming'            , 'Шерсть, когти, уши'               , 10
  UNION ALL SELECT 'care',      'Амуниция'             , 'care-gear'                , 'Ошейники, шлейки, намордники'     , 20
  UNION ALL SELECT 'care',      'Дом и поездки'        , 'care-home-travel'         , 'Перевозка, отели, переноски'      , 30
) s ON s.cat_slug = c.slug
ON DUPLICATE KEY UPDATE
  description=VALUES(description),
  sort_order=VALUES(sort_order);

-- Пользователи
INSERT INTO users (email, username, password_hash, role, bio, avatar_url) VALUES
('admin@doggo.local', 'admin', '$2b$10$F6c9ZdPW8kEXmVtJte57fu38uP8aaEgKOZ/QYBD2LHLtt9hmtjsCi', 'admin', 'Админ форума. Слежу за порядком 🐶', NULL),
('user1@doggo.local', 'luna',  '$2b$10$J7N7IReDntMSgL725bjuquoERMuu17lsQ4n8BSlwyYmMSD2H.AcV2',  'user',  'Люблю дрессировку и фрисби.', NULL),
('user2@doggo.local', 'buddy', '$2b$10$J7N7IReDntMSgL725bjuquoERMuu17lsQ4n8BSlwyYmMSD2H.AcV2',  'user',  'Щенок дома — каждый день приключение.', NULL),
('user3@doggo.local', 'mila',  '$2b$10$J7N7IReDntMSgL725bjuquoERMuu17lsQ4n8BSlwyYmMSD2H.AcV2',  'user',  'Пишу про здоровье и питание.', NULL),
('user4@doggo.local', 'rex',   '$2b$10$J7N7IReDntMSgL725bjuquoERMuu17lsQ4n8BSlwyYmMSD2H.AcV2',  'user',  'Опыт с овчарками и рабочими собаками.', NULL),
('user5@doggo.local', 'sona',  '$2b$10$J7N7IReDntMSgL725bjuquoERMuu17lsQ4n8BSlwyYmMSD2H.AcV2',  'user',  'Уход, груминг, амуниция.', NULL)
ON DUPLICATE KEY UPDATE
  role=VALUES(role),
  bio=VALUES(bio);

-- Посты
INSERT INTO posts (user_id, category_id, section_id, title, content, status, views_count)
SELECT u.id, c.id, s.id,
       p.title,
       p.content,
       'published',
       p.views
FROM (
  SELECT 'luna' AS username, 'training' AS cat_slug, 'training-obedience' AS sec_slug,
         'Как научить "Ко мне" без нервов?' AS title,
         'Делюсь схемой: короткие подходы, высокая ценность награды, прогрессия отвлечений. Важно: не звать для "плохих" вещей.' AS content,
         42 AS views
  UNION ALL SELECT 'buddy','health','health-puppies',
         'Щенок грызёт всё подряд — что делать?',
         'Нормально для возраста. Дайте безопасные альтернативы, режим сна, и уберите доступ к ценным вещам. Кратко: предотвращение + перенаправление.',
         88
  UNION ALL SELECT 'mila','health','health-nutrition',
         'Аллергия на курицу: чем заменить?',
         'Пробовали индейку/ягнёнка? Смотрите состав лакомств и кормов. Иногда реакция на добавки. Переход делайте плавно.',
         64
  UNION ALL SELECT 'rex','training','training-behavior',
         'Собака лает на гостей — рабочая схема',
         'Тренируем "место" и альтернативное поведение: коврик, фиксация, подкрепление за спокойствие. Начинаем с имитаций визитов.',
         51
  UNION ALL SELECT 'sona','care','care-grooming',
         'Когти: как подстричь без истерики',
         'Десенсибилизация: касания лапы + лакомство, потом когтерез показываем, звук, и только затем 1 коготь за сессию.',
         29
  UNION ALL SELECT 'luna','training','training-activity',
         'Игры на нюх дома (5 идей)',
         'Коробки, полотенце-рулон, поиск по команде, конг/лизательный коврик, мини-трекинг по квартире.',
         73
  UNION ALL SELECT 'buddy','care','care-home-travel',
         'Поездка на машине: как приучить?',
         'Сначала статично в машине, затем короткие поездки 1–2 минуты. Следите за укачиванием. Используйте переноску/ремень.',
         40
  UNION ALL SELECT 'mila','health','health-vet',
         'Прививки: примерный график (обсуждение)',
         'Обсудим общий подход: первичные прививки щенку, ревакцинация, бешенство. Всегда ориентируйтесь на рекомендации вашего врача.',
         55
  UNION ALL SELECT 'rex','breeds','breeds-choose',
         'Какая порода для активных прогулок и спорта?',
         'Если хотите спорт: бордер-колли, малинуа, ретриверы — но важно учитывать опыт и готовность к нагрузке.',
         36
  UNION ALL SELECT 'sona','care','care-gear',
         'Шлейка или ошейник? плюсы/минусы',
         'Шлейка удобна для многих собак, но правильная посадка критична. Ошейник — для спокойной ходьбы и идентификации. Часто лучший вариант — комбинация.',
         48
  UNION ALL SELECT 'luna','breeds','breeds-experience',
         'Опыт с корги: характер, прогулки, дрессировка',
         'Упрямство есть, но при мотивации отлично учатся. Нагрузка нужна умеренная, а ментальные игры — обязательно.',
         33
  UNION ALL SELECT 'mila','health','health-nutrition',
         'Можно ли собаке рыбу? (без фанатизма)',
         'Да, но аккуратно с костями и жирностью. Лучше отварная/запечённая, без соли/специй. Следите за реакциями.',
         27
) p
JOIN users u      ON u.username = p.username
JOIN categories c ON c.slug = p.cat_slug
JOIN sections s   ON s.slug = p.sec_slug;

-- Комментарии
INSERT INTO comments (post_id, user_id, content)
SELECT post.id, u.id, t.content
FROM (
  SELECT 'Как научить "Ко мне" без нервов?' AS post_title, 'buddy' AS username, 'Подтверждаю: если зовёшь только чтобы уйти домой — команда "умирает".' AS content
  UNION ALL SELECT 'Как научить "Ко мне" без нервов?', 'rex', 'Добавлю: полезно делать "ложные" подходы — позвал, наградил, отпустил.'
  UNION ALL SELECT 'Аллергия на курицу: чем заменить?', 'luna', 'У нас помогло убрать вообще все лакомства с курицей, даже "незаметные".'
  UNION ALL SELECT 'Когти: как подстричь без истерики', 'mila', 'Лизательный коврик во время процедуры — топ!'
  UNION ALL SELECT 'Поездка на машине: как приучить?', 'sona', 'Ещё помогает закрыть обзор из окна, если перевозбуждается.'
  UNION ALL SELECT 'Шлейка или ошейник? плюсы/минусы', 'rex', 'Важно: Y-образная шлейка чаще лучше по биомеханике.'
  UNION ALL SELECT 'Щенок грызёт всё подряд — что делать?', 'mila', 'Если недосып — грызёт сильнее. Сон реально решает.'
  UNION ALL SELECT 'Прививки: примерный график (обсуждение)', 'buddy', 'Спасибо, как раз актуально. Записались к врачу на выходных.'
) t
JOIN posts post ON post.title = t.post_title
JOIN users u    ON u.username = t.username;

-- Сохранённые
INSERT IGNORE INTO saved_posts (user_id, post_id)
SELECT u.id, p.id
FROM users u
JOIN posts p
WHERE (u.username = 'luna'  AND p.title IN ('Аллергия на курицу: чем заменить?','Когти: как подстричь без истерики'))
   OR (u.username = 'buddy' AND p.title IN ('Как научить "Ко мне" без нервов?','Шлейка или ошейник? плюсы/минусы'))
   OR (u.username = 'mila'  AND p.title IN ('Игры на нюх дома (5 идей)','Поездка на машине: как приучить?'));

-- Немного просмотров
INSERT INTO post_views (post_id, user_id, ip)
SELECT p.id, u.id, '127.0.0.1'
FROM posts p
JOIN users u ON u.username IN ('luna','buddy','mila')
ORDER BY p.id
LIMIT 25;
