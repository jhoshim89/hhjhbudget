import { useRegisterSW } from 'virtual:pwa-register/react'

function ReloadPrompt() {
  const {
    offlineReady: [offlineReady, setOfflineReady],
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r) {
      console.log('SW Registered:', r)
    },
    onRegisterError(error) {
      console.log('SW registration error', error)
    },
  })

  const close = () => {
    setOfflineReady(false)
    setNeedRefresh(false)
  }

  if (!offlineReady && !needRefresh) return null

  return (
    <div className="fixed bottom-20 left-4 right-4 md:bottom-4 md:left-auto md:right-4 md:w-80 z-50">
      <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-4 shadow-xl">
        <p className="text-sm text-zinc-200 mb-3">
          {offlineReady
            ? '오프라인에서도 사용할 수 있습니다.'
            : '새 버전이 있습니다. 업데이트하시겠습니까?'}
        </p>
        <div className="flex gap-2">
          {needRefresh && (
            <button
              onClick={() => updateServiceWorker(true)}
              className="flex-1 px-3 py-2 bg-violet-600 hover:bg-violet-700 text-white text-sm rounded-md transition-colors"
            >
              업데이트
            </button>
          )}
          <button
            onClick={close}
            className="flex-1 px-3 py-2 bg-zinc-700 hover:bg-zinc-600 text-zinc-200 text-sm rounded-md transition-colors"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  )
}

export default ReloadPrompt
