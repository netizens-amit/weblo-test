import React from 'react'
import { Award, Heart, MapPin, Shield } from 'lucide-react'

const Heritage = () => {
  const milestones = [
    { year: '1950', title: 'Foundation', description: 'Timex established in Mumbai, bringing Swiss precision to Indian craftsmanship.' },
    { year: '1975', title: 'Expansion', description: 'First boutique opened in Delhi, showcasing luxury timepieces to discerning clients.' },
    { year: '1995', title: 'Innovation', description: 'Introduced hand-engraved collections, blending traditional Indian art with modern design.' },
    { year: '2020', title: 'Global Recognition', description: 'Timex watches featured in international luxury watch exhibitions.' }
  ]

  const values = [
    {
      icon: <Shield className="h-8 w-8 text-amber-600" />,
      title: 'Quality',
      description: 'Each timepiece undergoes 150+ quality checks to ensure perfection.'
    },
    {
      icon: <Heart className="h-8 w-8 text-orange-600" />,
      title: 'Passion',
      description: 'Crafted with love and dedication by master artisans.'
    },
    {
      icon: <Award className="h-8 w-8 text-red-600" />,
      title: 'Excellence',
      description: 'Awarded for outstanding craftsmanship and design innovation.'
    }
  ]

  return (
    <section id="heritage" className="py-20 bg-gradient-to-br from-amber-50 via-orange-50 to-red-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left Column */}
          <div>
            <div className="mb-8">
              <h2 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
                A Legacy of
                <span className="bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent"> Excellence</span>
              </h2>
              <p className="text-lg text-gray-700 leading-relaxed">
                For over 70 years, Timex has been synonymous with luxury, precision, and Indian heritage. 
                Our journey began with a simple vision: to create timepieces that honor tradition while embracing innovation.
              </p>
            </div>

            {/* Values Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
              {values.map((value, index) => (
                <div key={index} className="bg-white/80 backdrop-blur-sm p-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
                  <div className="mb-4">{value.icon}</div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">{value.title}</h3>
                  <p className="text-gray-600 text-sm">{value.description}</p>
                </div>
              ))}
            </div>

            {/* Location Info */}
            <div className="flex items-center space-x-4 text-gray-700">
              <MapPin className="h-6 w-6 text-amber-600" />
              <span className="font-medium">Crafted in Mumbai, India</span>
            </div>
          </div>

          {/* Right Column - Timeline */}
          <div className="relative">
            <div className="bg-white rounded-2xl p-8 shadow-2xl">
              <h3 className="text-2xl font-bold text-gray-900 mb-8">Our Journey</h3>
              
              <div className="space-y-8">
                {milestones.map((milestone, index) => (
                  <div key={index} className="relative pl-8 border-l-2 border-amber-200 hover:border-amber-600 transition-colors">
                    <div className="absolute left-[-9px] top-1 w-4 h-4 bg-amber-600 rounded-full border-4 border-white shadow-lg"></div>
                    <div className="bg-gradient-to-r from-amber-50 to-orange-50 p-4 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-bold text-amber-600">{milestone.year}</span>
                        <div className="w-2 h-2 bg-orange-400 rounded-full"></div>
                      </div>
                      <h4 className="font-semibold text-gray-900 mb-1">{milestone.title}</h4>
                      <p className="text-sm text-gray-600">{milestone.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Decorative Elements */}
            <div className="absolute -top-4 -right-4 w-24 h-24 bg-amber-400/20 rounded-full blur-xl"></div>
            <div className="absolute -bottom-4 -left-4 w-32 h-32 bg-orange-400/20 rounded-full blur-xl"></div>
          </div>
        </div>
      </div>
    </section>
  )
}

export default Heritage
