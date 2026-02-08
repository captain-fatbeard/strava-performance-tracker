interface LoginButtonProps {
  onClick: () => void
}

export function LoginButton({ onClick }: LoginButtonProps) {
  return (
    <button onClick={onClick} className="flex items-center gap-3 bg-linear-to-br from-accent to-accent-dark text-white border-none py-4 px-8 text-base font-semibold rounded-[var(--radius-md)] cursor-pointer transition-all duration-200 shadow-[var(--shadow-md),0_0_30px_rgba(20,184,166,0.25)] hover:-translate-y-0.5 hover:shadow-[var(--shadow-lg),var(--shadow-glow)] active:translate-y-0 active:scale-[0.98]">
      <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
        <path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.169" />
      </svg>
      Connect with Strava
    </button>
  )
}
