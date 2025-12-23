import React from 'react'
import { Wrench, Eye, Hand, Target } from 'lucide-react'

const Craftsmanship = () => {
  const processSteps = [
    {
      icon: <Target className="h-8 w-8 text-amber-600" />,
      title: 'Design',
      description: 'Each watch begins with meticulous design, inspired by Indian art and architecture.'
    },
    {
      icon: <Wrench className="h-8 w-8 text-orange-600" />,
      title: 'Crafting',
      description: 'Master artisans handcraft each component with precision and care.'
    },
    {
      icon: <Eye className="h-8 w-8 text-red-600" />,
      title: 'Quality Control',
      description: 'Rigorous testing ensures every timepiece meets our exacting standards.'
    },
    {
      icon: <Hand className="h-8 w-8 text-amber-600" />,
      title: 'Assembly',
      description: 'Final assembly performed by expert watchmakers with decades of experience.'
    }
  ]

  return (
    <section id="craftsmanship" className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
            The Art of
            <span className="bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent"> Craftsmanship</span>
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Every Timex watch is a testament to the skill, patience, and passion of our master artisans. 
            From the first sketch to the final polish, each timepiece is created with unwavering dedication to perfection.
          </p>
        </div>

        {/* Process Steps */}
        <div className="grid md:grid-cols-4 gap-8 mb-20">
          {processSteps.map((step, index) => (
            <div key={index} className="text-center group">
              <div className="bg-gradient-to-br from-amber-50 to-orange-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-300">
                {step.icon}
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-4">{step.title}</h3>
              <p className="text-gray-600 leading-relaxed">{step.description}</p>
            </div>
          ))}
        </div>

        {/* Featured Watch Showcase */}
        <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-3xl p-8 md:p-12 text-white">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="mb-6 flex items-center space-x-4">
                <div className="w-3 h-3 bg-amber-400 rounded-full animate-pulse"></div>
                <span className="text-amber-400 font-semibold">Masterpiece Collection</span>
              </div>
              <h3 className="text-3xl md:text-4xl font-bold mb-6">
                The Maharaja Edition
              </h3>
              <p className="text-gray-300 mb-8 leading-relaxed">
                Our most exclusive timepiece, featuring 24-karat gold plating, 
                hand-engraved motifs inspired by Mughal architecture, and a 
                Swiss-made automatic movement. Only 50 pieces available worldwide.
              </p>
              
              <div className="grid grid-cols-2 gap-4 mb-8">
                <div className="bg-white/10 p-4 rounded-lg">
                  <span className="text-amber-400 text-sm">Materials</span>
                  <p className="text-white font-semibold">24K Gold, Sapphire</p>
                </div>
                <div className="bg-white/10 p-4 rounded-lg">
                  <span className="text-amber-400 text-sm">Movement</span>
                  <p className="text-white font-semibold">Swiss Automatic</p>
                </div>
                <div className="bg-white/10 p-4 rounded-lg">
                  <span className="text-amber-400 text-sm">Limited</span>
                  <p className="text-white font-semibold">50 Pieces</p>
                </div>
                <div className="bg-white/10 p-4 rounded-lg">
                  <span className="text-amber-400 text-sm">Price</span>
                  <p className="text-white font-semibold">₹15,00,000</p>
                </div>
              </div>

              <button className="bg-gradient-to-r from-amber-500 to-orange-500 text-gray-900 px-8 py-3 rounded-full font-semibold hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
                Request Private Viewing
              </button>
            </div>

            <div className="relative">
              <div className="relative w-full h-96 bg-gradient-to-br from-amber-400 to-orange-500 rounded-2xl shadow-2xl">
                {/* Watch Mockup */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-64 h-64 bg-white rounded-full shadow-inner flex items-center justify-center relative">
                    <div className="w-48 h-48 border-4 border-gray-200 rounded-full relative">
                      {/* Watch Details */}
                      <div className="absolute top-6 left-1/2 transform -translate-x-1/2 text-center">
                        <div className="w-3 h-3 bg-gray-400 rounded-full mx-auto mb-2"></div>
                        <span className="text-xs text-gray-500 font-medium">TIMEX</span>
                      </div>
                      <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 text-center">
                        <div className="w-3 h-3 bg-gray-400 rounded-full mx-auto mb-2"></div>
                        <span className="text-xs text-gray-500 font-medium">MAHARAJA</span>
                      </div>
                      <div className="absolute left-6 top-1/2 transform -translate-y-1/2">
                        <div className="w-3 h-3 bg-gray-400 rounded-full"></div>
                      </div>
                      <div className="absolute right-6 top-1/2 transform -translate-y-1/2">
                        <div className="w-3 h-3 bg-gray-400 rounded-full"></div>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Decorative Elements */}
                <div className="absolute -top-4 -left-4 w-20 h-20 bg-white/20 rounded-full"></div>
                <div className="absolute -bottom-4 -right-4 w-24 h-24 bg-white/20 rounded-full"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

export default Craftsmanship
