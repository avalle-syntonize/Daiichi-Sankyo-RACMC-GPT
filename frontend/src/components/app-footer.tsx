import * as React from "react"

const data = {
 
}
export function AppFooter() {
  return (
  <footer className="px-4 bg-white border-t w-full h-[68px] items-center justify-between md:flex hidden">
    <p className="text-sm">Passeig Sant Joan de Déu 2, 08950 Esplugues de Llobregat, Espanya</p>
    <p className="text-sm text-right lg:text-left">Copyright {new Date().getFullYear()} InformA</p>
  </footer>
  )
}