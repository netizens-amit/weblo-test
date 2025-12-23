import React from 'react'
import Navbar from './components/Navbar'
import Hero from './components/Hero'
import Collections from './components/Collections'
import Heritage from './components/Heritage'
import Craftsmanship from './components/Craftsmanship'
import About from './components/About'
import Contact from './components/Contact'
import Footer from './components/Footer'

function App() {
  return (
    <div className="relative">
      <Navbar />
      <main>
        <Hero />
        <Collections />
        <Heritage />
        <Craftsmanship />
        <About />
        <Contact />
      </main>
      <Footer />
    </div>
  )
}

export default App
