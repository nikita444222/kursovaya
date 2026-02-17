// Автосабмит фильтров (категория/раздел)
document.addEventListener('change', (e) => {
  const el = e.target
  if (el && el.matches('[data-autosubmit]')) {
    const form = el.closest('form')
    if (form) form.submit()
  }
})
