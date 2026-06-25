import { Toaster as Sonner, type ToasterProps } from 'sonner'
import { useTheme } from '@/components/theme-provider'

function Toaster(props: ToasterProps) {
  const { resolvedTheme } = useTheme()
  return (
    <Sonner
      theme={resolvedTheme}
      richColors
      position="top-right"
      toastOptions={{
        classNames: {
          toast: 'rounded-lg border',
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
