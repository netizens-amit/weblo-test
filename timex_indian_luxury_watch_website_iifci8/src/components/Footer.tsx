import React from 'react'
import { Instagram, Facebook, Twitter, Youtube, Mail, Phone } from 'lucide-react'

const Footer = () => {
  const quickLinks = [
    { name: 'Collections', href: '#collections' },
    { name: 'Heritage', href: '#heritage' },
    { name: 'Craftsmanship', href: '#craftsmanship' },
    { name: 'About Us', href: '#about' },
    { name: 'Contact', href: '#contact' }
  ]

  const services = [
    { name: 'Private Consultation', href: '#' },
    { name: 'Custom Orders', href: '#' },
    { name: 'Watch Servicing', href: '#' },
    { name: 'Authentication', href: '#' },
    { name: 'Financing', href: '#' }
  ]

  const support = [
    { name: 'FAQs', href: '#' },
    { name: 'Shipping & Returns', href: '#' },
    { name: 'Warranty', href: '#' },
    { name: 'Care Instructions', href: '#' },
    { name: 'Size Guide', href: '#' }
  ]

  return (
    <footer className="bg-gray-900 text-white">
      {/* Newsletter Section */}
      <div className="bg-gradient-to-r from-amber-600 to-orange-600 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h3 className="text-2xl font-bold mb-4">Stay Updated</h3>
            <p className="text-amber-100 mb-6">Subscribe to our newsletter for exclusive updates, new collections, and special offers.</p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center max-w-md mx-auto">
              <input
                type="email"
                placeholder="Your email address"
                className="flex-1 px-4 py-3 bg-white/90 text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
              <button className="bg-gray-900 text-amber-600 px-6 py-3 rounded-lg font-semibold hover:bg-gray-800 transition-colors">
                Subscribe
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Footer */}
      <div className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8">
            {/* Brand Info */}
            <div className="md:col-span-1">
              <div className="flex items-center mb-6">
                <div className="w-10 h-10 bg-gradient-to-br from-amber-600 to-orange-600 rounded-full flex items-center justify-center shadow-lg">
                  <span className="text-white font-bold text-sm">T</span>
                </div>
                <span className="ml-3 text-2xl font-bold">Timex</span>
              </div>
              <p className="text-gray-400 mb-6 leading-relaxed">
                Since 1950, Timex has been crafting luxury timepieces that blend Indian heritage 
                with Swiss precision. Each watch is a masterpiece of artistry and engineering.
              </p>
              
              <div className="flex space-x-4">
                <a href="#" className="text-gray-400 hover:text-amber-400 transition-colors">
                  <Instagram className="h-6 w-6" />
                </a>
                <a href="#" className="text-gray-400 hover:text-amber-400 transition-colors">
                  <Facebook className="h-6 w-6" />
                </a>
                <a href="#" className="text-gray-400 hover:text-amber-400 transition-colors">
                  <Twitter className="h-6 w-6" />
                </a>
                <a href="#" className="text-gray-400 hover:text-amber-400 transition-colors">
                  <Youtube className="h-6 w-6" />
                </a>
              </div>
            </div>

            {/* Quick Links */}
            <div>
              <h4 className="font-bold text-lg mb-6">Quick Links</h4>
              <ul className="space-y-4">
                {quickLinks.map((link, index) => (
                  <li key={index}>
                    <a href={link.href} className="text-gray-400 hover:text-amber-400 transition-colors">
                      {link.name}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            {/* Services */}
            <div>
              <h4 className="font-bold text-lg mb-6">Services</h4>
              <ul className="space-y-4">
                {services.map((service, index) => (
                  <li key={index}>
                    <a href={service.href} className="text-gray-400 hover:text-amber-400 transition-colors">
                      {service.name}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            {/* Support */}
            <div>
              <h4 className="font-bold text-lg mb-6">Support</h4>
              <ul className="space-y-4">
                {support.map((item, index) => (
                  <li key={index}>
                    <a href={item.href} className="text-gray-400 hover:text-amber-400 transition-colors">
                      {item.name}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Contact Info */}
          <div className="border-t border-gray-800 mt-12 pt-8">
            <div className="grid md:grid-cols-3 gap-8 text-center md:text-left">
              <div className="flex items-center justify-center md:justify-start space-x-4">
                <Mail className="h-5 w-5 text-amber-400" />
                <span className="text-gray-400">info@timex.in</span>
              </div>
              <div className="flex items-center justify-center md:justify-start space-x-4">
                <Phone className="h-5 w-5 text-amber-400" />
                <span className="text-gray-400">+91 98765 43210</span>
              </div>
              <div className="text-gray-500 text-sm text-center md:text-right">
                © 2025 Timex. All rights reserved.
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}

export default Footer
