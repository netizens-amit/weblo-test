import React from 'react'
import { ArrowRight, Clock, Gem, Crown } from 'lucide-react'

const collections = [
  {
    id: 1,
    title: 'Royal Heritage',
    description: 'Inspired by the grandeur of Indian royalty, featuring intricate engravings and precious stone accents.',
    image: 'https://images.unsplash.com/photo-1508685096489-7aacd43bd3b1?w=800&auto=format&fit=crop&q=60',
    price: 'Starting at ₹2,50,000',
    badge: 'Limited Edition'
  },
  {
    id: 2,
    title: 'Modern Classic',
    description: 'Sleek and sophisticated designs that blend traditional craftsmanship with contemporary style.',
    image: 'https://images.unsplash.com/photo-1523275335682-92da4c34ce4c?w=800&auto=format&fit=crop&q=60',
    price: 'Starting at ₹1,20,000',
    badge: 'Best Seller'
  },
  {
    id: 3,
    title: 'Artisan Series',
    description: 'Handcrafted timepieces showcasing the finest Indian artistry and attention to detail.',
    image: 'https://images.unsplash.com/photo-1549237529-b2490de7160a?w=800&auto=format&fit=crop&q=60',
    price: 'Starting at ₹3,50,000',
    badge: 'Handmade'
  }
]

const Collections = () => {
  return (
    <section id="collections" className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
            Our Exquisite
            <span className="bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent"> Collections</span>
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Each collection represents a different facet of Indian luxury and craftsmanship, 
            carefully curated to offer you the finest timepieces that reflect your unique style.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {collections.map((collection, index) => (
            <div key={collection.id} className="group relative bg-gradient-to-br from-gray-50 to-white rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-2">
              {/* Image Overlay */}
              <div className="relative overflow-hidden">
                <img 
                  src={collection.image} 
                  alt={collection.title}
                  className="w-full h-64 object-cover group-hover:scale-110 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent"></div>
                
                {/* Badge */}
                <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full text-sm font-semibold text-gray-800">
                  {collection.badge}
                </div>
              </div>

              {/* Content */}
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-2xl font-bold text-gray-900 group-hover:text-amber-600 transition-colors">
                    {collection.title}
                  </h3>
                  <div className="flex space-x-2">
                    <Clock className="h-5 w-5 text-amber-600" />
                    <Gem className="h-5 w-5 text-orange-600" />
                    <Crown className="h-5 w-5 text-red-600" />
                  </div>
                </div>
                
                <p className="text-gray-600 mb-6 leading-relaxed">
                  {collection.description}
                </p>
                
                <div className="flex items-center justify-between">
                  <span className="text-lg font-semibold text-gray-900">
                    {collection.price}
                  </span>
                  <button className="flex items-center space-x-2 text-amber-600 hover:text-orange-600 font-semibold transition-colors group-hover:translate-x-2 transition-transform">
                    <span>View Details</span>
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Hover Effect */}
              <div className="absolute inset-0 bg-gradient-to-br from-amber-500/0 to-orange-500/0 group-hover:from-amber-500/10 group-hover:to-orange-500/10 transition-all duration-500"></div>
            </div>
          ))}
        </div>

        {/* View All Button */}
        <div className="text-center mt-12">
          <button className="group bg-gradient-to-r from-amber-600 to-orange-600 text-white px-8 py-4 rounded-full text-lg font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300 flex items-center justify-center space-x-2 mx-auto">
            <span>View All Collections</span>
            <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      </div>
    </section>
  )
}

export default Collections
