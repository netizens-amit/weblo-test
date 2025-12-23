import React from 'react'
import { Users, Globe, Trophy, Heart } from 'lucide-react'

const About = () => {
  const stats = [
    { label: 'Years of Excellence', value: '75+', icon: <Trophy className="h-6 w-6 text-amber-600" /> },
    { label: 'Master Artisans', value: '150+', icon: <Users className="h-6 w-6 text-orange-600" /> },
    { label: 'Countries Served', value: '25+', icon: <Globe className="h-6 w-6 text-red-600" /> },
    { label: 'Happy Customers', value: '50,000+', icon: <Heart className="h-6 w-6 text-amber-600" /> }
  ]

  const testimonials = [
    {
      name: 'Rajesh Mehta',
      title: 'Business Executive',
      quote: 'Owning a Timex watch is not just about telling time, it\'s about carrying a piece of Indian heritage on your wrist. The craftsmanship is unparalleled.',
      image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=60'
    },
    {
      name: 'Priya Sharma',
      title: 'Fashion Designer',
      quote: 'The attention to detail in Timex watches is breathtaking. Each piece tells a story of tradition and luxury.',
      image: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150&auto=format&fit=crop&q=60'
    },
    {
      name: 'Amit Patel',
      title: 'Collector',
      quote: 'I\'ve been collecting luxury watches for 20 years, and Timex stands out for its unique blend of Indian artistry and Swiss precision.',
      image: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&auto=format&fit=crop&q=60'
    }
  ]

  return (
    <section id="about" className="py-20 bg-gradient-to-br from-amber-50 via-orange-50 to-red-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Stats Section */}
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
            Why Choose
            <span className="bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent"> Timex</span>
          </h2>
          <p className="text-xl text-gray-700 max-w-3xl mx-auto">
            Our commitment to excellence, heritage, and customer satisfaction sets us apart in the world of luxury timepieces.
          </p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 mb-20">
          {stats.map((stat, index) => (
            <div key={index} className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2 text-center">
              <div className="flex justify-center mb-4">{stat.icon}</div>
              <div className="text-3xl font-bold text-gray-900 mb-2">{stat.value}</div>
              <div className="text-gray-600 text-sm">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Testimonials */}
        <div className="bg-white rounded-3xl p-8 md:p-12 shadow-xl">
          <h3 className="text-3xl font-bold text-gray-900 mb-12 text-center">What Our Clients Say</h3>
          
          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <div key={index} className="text-center group">
                <div className="relative inline-block mb-6">
                  <img 
                    src={testimonial.image} 
                    alt={testimonial.name}
                    className="w-20 h-20 rounded-full object-cover border-4 border-white shadow-lg group-hover:scale-110 transition-transform duration-300"
                  />
                  <div className="absolute -bottom-2 -right-2 w-6 h-6 bg-amber-500 rounded-full flex items-center justify-center">
                    <Heart className="h-3 w-3 text-white" />
                  </div>
                </div>
                
                <blockquote className="text-gray-600 mb-6 italic leading-relaxed">
                  "{testimonial.quote}"
                </blockquote>
                
                <div>
                  <div className="font-semibold text-gray-900">{testimonial.name}</div>
                  <div className="text-sm text-gray-500">{testimonial.title}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Call to Action */}
        <div className="text-center mt-16">
          <h4 className="text-2xl font-bold text-gray-900 mb-4">Ready to Experience Timex Luxury?</h4>
          <p className="text-gray-600 mb-8">Schedule a private consultation with our watch experts.</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button className="bg-gradient-to-r from-amber-600 to-orange-600 text-white px-8 py-4 rounded-full text-lg font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300">
              Book Consultation
            </button>
            <button className="border-2 border-gray-300 text-gray-700 px-8 py-4 rounded-full text-lg font-semibold hover:border-amber-600 hover:text-amber-600 transition-all duration-300">
              Visit Boutique
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}

export default About
