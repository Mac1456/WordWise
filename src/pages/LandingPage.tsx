import { Link } from 'react-router-dom'
import { CheckCircle, Zap, ShieldCheck, BarChart3, Feather, Award } from 'lucide-react'
import Header from '../components/Header'

export default function LandingPage() {
  const features = [
    {
      icon: <Zap className="h-8 w-8 text-white" />,
      title: 'Real-Time Suggestions',
      description: 'Get instant feedback on grammar, spelling, and style as you type.',
      color: 'bg-blue-500',
    },
    {
      icon: <BarChart3 className="h-8 w-8 text-white" />,
      title: 'Advanced Tone Analysis',
      description: 'Ensure your writing strikes the perfect tone for your audience.',
      color: 'bg-green-500',
    },
    {
      icon: <ShieldCheck className="h-8 w-8 text-white" />,
      title: '99% Accuracy',
      description: 'Our AI provides highly accurate suggestions you can trust.',
      color: 'bg-indigo-500',
    },
    {
      icon: <Feather className="h-8 w-8 text-white" />,
      title: 'Clean & Simple UI',
      description: 'A distraction-free interface to help you focus on what matters: your writing.',
      color: 'bg-purple-500',
    },
    {
      icon: <Award className="h-8 w-8 text-white" />,
      title: 'Multiple Essay Types',
      description: 'Support for various essay types including personal statements, supplemental essays, and cover letters.',
      color: 'bg-pink-500',
    },
    {
      icon: <CheckCircle className="h-8 w-8 text-white" />,
      title: 'Word Limit Management',
      description: 'Stay within college application word limits with real-time word counting and progress indicators.',
      color: 'bg-red-500',
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50 text-gray-800">
      <Header />

      {/* Hero Section */}
      <main>
        <section className="relative pt-20 pb-24 sm:pt-24 sm:pb-32">
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute top-0 left-0 w-[150%] h-[150%] bg-gradient-to-br from-blue-50 via-white to-indigo-100 transform -skew-y-6 -translate-y-1/4"></div>
          </div>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
            <div className="text-center">
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-gray-900 tracking-tight leading-tight">
                Craft Your Story,
                <br />
                <span className="text-blue-600">Perfect Your Pitch.</span>
              </h1>
              <p className="mt-6 text-lg text-gray-600 max-w-2xl mx-auto">
                WordWise is your AI-powered co-pilot for writing standout college application essays.
                Go beyond grammar and spelling to refine your tone, style, and impact.
              </p>
              <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
                <Link
                  to="/signup"
                  className="px-8 py-3 bg-blue-600 text-white text-lg font-semibold rounded-lg shadow-md hover:bg-blue-700 transition-all transform hover:scale-105"
                >
                  Get Started for Free
                </Link>
                <Link
                  to="/login"
                  className="px-8 py-3 bg-white text-gray-700 text-lg font-semibold rounded-lg shadow-md hover:bg-gray-100 transition-all"
                >
                  Sign In
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">
                Everything You Need to Succeed
              </h2>
              <p className="mt-4 text-xl text-gray-600 max-w-3xl mx-auto">
                WordWise provides a comprehensive suite of tools to elevate your writing.
              </p>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {features.map((feature, index) => (
                <div
                  key={index}
                  className="bg-white p-8 rounded-xl shadow-lg border border-gray-200/80 transform hover:-translate-y-2 transition-transform duration-300"
                >
                  <div
                    className={`w-14 h-14 ${feature.color} rounded-lg flex items-center justify-center mb-6 shadow-md`}
                  >
                    {feature.icon}
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-3">
                    {feature.title}
                  </h3>
                  <p className="text-gray-600">
                    {feature.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Testimonial Section */}
        <section className="py-20 bg-gray-100">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <img
              src="https://randomuser.me/api/portraits/women/68.jpg"
              alt="Testimonial user"
              className="w-20 h-20 rounded-full mx-auto mb-4 border-4 border-white shadow-lg"
            />
            <blockquote className="text-xl text-gray-800 italic">
              "WordWise was a game-changer for my college essays. The AI suggestions helped me catch mistakes I would have missed and made my writing so much stronger. I got into my dream school!"
            </blockquote>
            <p className="mt-4 font-semibold text-gray-900">Jessica L.</p>
            <p className="text-gray-600">Accepted to Stanford University</p>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-24 bg-white">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              Ready to Elevate Your Writing?
            </h2>
            <p className="text-xl text-gray-600 mb-8">
              Start your journey with WordWise today and write with unparalleled confidence.
            </p>
            <Link
              to="/signup"
              className="inline-flex items-center px-10 py-4 bg-blue-600 text-white text-lg font-semibold rounded-lg shadow-lg hover:bg-blue-700 transition-transform transform hover:scale-105"
            >
              Sign Up and Start Writing
            </Link>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-gray-800 text-white">
        <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center">
            <p>&copy; {new Date().getFullYear()} WordWise AI. All rights reserved.</p>
            <div className="flex space-x-4">
              <Link to="#" className="hover:text-gray-300">Privacy Policy</Link>
              <Link to="#" className="hover:text-gray-300">Terms of Service</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
} 