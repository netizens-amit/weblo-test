import React from 'react'
import { ArrowRight, Star, Sparkles } from 'lucide-react'

const Hero = () => {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-gradient-to-br from-amber-50 via-orange-50 to-red-50">
      {/* Animated Background Elements */}
      <div className="absolute inset-0">
        <div className="absolute top-20 left-10 w-72 h-72 bg-amber-400/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute top-40 right-10 w-96 h-96 bg-orange-400/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute bottom-20 left-1/2 w-80 h-80 bg-red-400/20 rounded-full blur-3xl animate-pulse delay-500"></div>
      </div>

      {/* Content */}
      <div className="relative z-10 text-center max-w-4xl mx-auto px-4">
        <div className="mb-8 flex justify-center">
          <div className="flex items-center space-x-4 bg-white/80 backdrop-blur-sm px-6 py-2 rounded-full shadow-lg">
            <Star className="h-5 w-5 text-amber-600 fill-amber-600" />
            <span className="text-sm font-medium text-gray-700">Since 1950</span>
            <Sparkles className="h-5 w-5 text-orange-600" />
            <span className="text-sm font-medium text-gray-700">Indian Heritage</span>
          </div>
        </div>

        <h1 className="text-6xl md:text-8xl font-bold text-gray-900 mb-6 leading-tight">
          <span className="bg-gradient-to-r from-amber-600 via-orange-600 to-red-600 bg-clip-text text-transparent">
            Timeless
          </span>
          <br />
          <span className="text-gray-800">Elegance</span>
        </h1>

        <p className="text-xl md:text-2xl text-gray-600 mb-12 max-w-2xl mx-auto leading-relaxed">
          Experience the perfect fusion of Indian craftsmanship and Swiss precision. 
          Each Timex watch is a masterpiece that tells a story of heritage, luxury, and timeless beauty.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button className="group bg-gradient-to-r from-amber-600 to-orange-600 text-white px-8 py-4 rounded-full text-lg font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300 flex items-center justify-center space-x-2">
            <span>Explore Collections</span>
            <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
          </button>
          <button className="border-2 border-gray-300 text-gray-700 px-8 py-4 rounded-full text-lg font-semibold hover:border-amber-600 hover:text-amber-600 transition-all duration-300">
            Book Consultation
          </button>
        </div>

        {/* Scroll Indicator */}
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 animate-bounce">
          <div className="w-6 h-10 border-2 border-gray-300 rounded-full flex justify-center">
            <div className="w-1 h-3 bg-gray-400 rounded-full mt-2 animate-pulse"></div>
          </div>
        </div>
      </div>

      {/* Floating Watch Image */}
      <div className="absolute right-10 top-1/4 hidden lg:block">
        <div className="relative">
          <div className="w-64 h-64 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full opacity-20 animate-spin-slow"></div>
          <div className="absolute top-8 left-8 w-48 h-48 bg-white rounded-full shadow-2xl flex items-center justify-center">
            <div className="w-32 h-32 border-4 border-gray-200 rounded-full relative">
              <div className="absolute top-4 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-gray-400 rounded-full"></div>
              <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-gray-400 rounded-full"></div>
              <div className="absolute left-4 top-1/2 transform -translate-y-1/2 w-2 h-2 bg-gray-400 rounded-full"></div>
              <div className="absolute right-4 top-1/2 transform -translate-y-1/2 w-2 h-2 bg-gray-400 rounded-full"></div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

export default Hero
