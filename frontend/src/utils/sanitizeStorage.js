const JSON_KEYS = [
  'user',
  'sweetstar_selected_cinema',
  'sweetstar_ai_chat_v1:guest',
  'sweetstar_ai_chat_v1:user-',
  'adminHomeBanners',
  'adminSystemSettings',
  'adminStaffList',
  'sweetstar_news_category_labels',
  'visited_movie_tags_v1',
]

function isJsonKey(matchList, key) {
  return matchList.some((prefix) =>
    prefix.endsWith('-')
      ? key.startsWith(prefix)
      : key === prefix
  )
}

export function sanitizeLocalStorage() {
  if (typeof window === 'undefined' || !window.localStorage) return

  try {
    const keys = []
    for (let i = 0; i < window.localStorage.length; i++) {
      const k = window.localStorage.key(i)
      if (k) keys.push(k)
    }

    keys.forEach((key) => {
      if (!isJsonKey(JSON_KEYS, key)) return
      try {
        const raw = window.localStorage.getItem(key)
        if (raw === null || raw === '') return
        JSON.parse(raw)
      } catch (_err) {
        try {
          window.localStorage.removeItem(key)
        } catch {}
      }
    })

    const regionKey = 'selectedRegion'
    try {
      const raw = window.localStorage.getItem(regionKey)
      if (typeof raw !== 'string' && raw !== null) {
        window.localStorage.removeItem(regionKey)
      }
    } catch {}

    const token = window.localStorage.getItem('token')
    if (token !== null && typeof token !== 'string') {
      try {
        window.localStorage.removeItem('token')
      } catch {}
    }
  } catch (_outer) {}
}
