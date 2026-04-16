interface LoginButtonProps {
  onClick: () => void
}

export function LoginButton({ onClick }: LoginButtonProps) {
  return (
    <button
      onClick={onClick}
      className="group relative flex items-center gap-3 bg-linear-to-br from-accent to-accent-dark text-white border border-accent/30 py-4 px-10 text-base font-semibold rounded-[var(--radius-md)] cursor-pointer transition-all duration-300 shadow-[0_4px_16px_rgba(20,184,166,0.25)] hover:-translate-y-0.5 hover:shadow-[0_8px_32px_rgba(20,184,166,0.35)] active:translate-y-0 active:scale-[0.98]"
    >
      <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" className="transition-transform duration-300 group-hover:scale-110">
        <path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.169" />
      </svg>
      Connect with Strava
    </button>
  )
}
