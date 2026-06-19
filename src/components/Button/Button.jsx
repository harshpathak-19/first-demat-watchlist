function Button({ text, onClick, variant = 'primary', size = 'md' }) {
  const base = 'font-medium rounded-md transition-colors duration-200 cursor-pointer'

  const variants = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700',
    outline: 'border border-gray-300 text-gray-700 bg-white hover:bg-gray-50',
    danger:  'bg-red-600 text-white hover:bg-red-700',
    ghost:   'text-gray-600 hover:bg-gray-100 hover:text-gray-900',
  }

  const sizes = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-2.5 text-sm',
  }

  return (
    <button
      onClick={onClick}
      className={`${base} ${variants[variant]} ${sizes[size]}`}
    >
      {text}
    </button>
  )
}

export default Button
