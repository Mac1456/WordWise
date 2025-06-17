import { Link } from 'react-router-dom'
import { PenTool, Target, Star, CheckCircle, FileText, BarChart3 } from 'lucide-react'

export default function LandingPage() {
  return (
    <div className="bg-white">
      {/* Hero Section */}
      <section className="relative pt-12 pb-20 sm:pt-16 sm:pb-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 leading-tight">
              Write with intelligence.
              <br />
              <span className="text-primary-600">Perfect with AI.</span>
            </h1>
            <p className="mt-6 text-xl text-gray-600 max-w-3xl mx-auto">
              WordWise is an AI-powered writing assistant designed for high school students. 
              Get real-time grammar checking, style suggestions, and readability analysis to perfect your college application essays.
            </p>
            <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                to="/signup"
                className="px-8 py-4 bg-primary-600 text-white text-lg font-semibold rounded-lg hover:bg-primary-700 transition-colors"
              >
                Start Writing for Free
              </Link>
              <Link
                to="/login"
                className="px-8 py-4 border-2 border-gray-300 text-gray-700 text-lg font-semibold rounded-lg hover:border-gray-400 transition-colors"
              >
                Already have an account?
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              AI-Powered Writing Assistant Features
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Advanced grammar checking, style suggestions, and intelligent writing analysis
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Feature 1: Grammar Checking */}
            <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100">
              <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center mb-6">
                <CheckCircle className="h-6 w-6 text-red-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">
                Real-time Grammar Checking
              </h3>
              <p className="text-gray-600 mb-4">
                Advanced grammar analysis with 85%+ accuracy catches errors as you type, ensuring your writing is polished and professional.
              </p>
              <div className="text-sm text-gray-500">
                ✓ Subject-verb agreement<br/>
                ✓ Sentence fragment detection<br/>
                ✓ Run-on sentence alerts
              </div>
            </div>

            {/* Feature 2: Spell Checking */}
            <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-6">
                <FileText className="h-6 w-6 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">
                Intelligent Spell Checking
              </h3>
              <p className="text-gray-600 mb-4">
                Advanced spell checking with contextual suggestions helps you choose the right words and avoid common mistakes.
              </p>
              <div className="text-sm text-gray-500">
                ✓ Contextual corrections<br/>
                ✓ Multiple suggestions<br/>
                ✓ Instant error highlighting
              </div>
            </div>

            {/* Feature 3: Style Analysis */}
            <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-6">
                <BarChart3 className="h-6 w-6 text-green-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">
                Style & Readability Analysis
              </h3>
              <p className="text-gray-600 mb-4">
                Get suggestions to improve your writing style, eliminate weak words, and enhance readability for your target audience.
              </p>
              <div className="text-sm text-gray-500">
                ✓ Readability scoring<br/>
                ✓ Style improvements<br/>
                ✓ Sentence variety analysis
              </div>
            </div>

            {/* Feature 4: Clean Interface */}
            <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100">
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center mb-6">
                <PenTool className="h-6 w-6 text-orange-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">
                Clean Writing Interface
              </h3>
              <p className="text-gray-600 mb-4">
                Focus on your writing with a distraction-free editor designed for personal statement writing.
              </p>
              <div className="text-sm text-gray-500">
                ✓ Distraction-free design<br/>
                ✓ Focus on content<br/>
                ✓ Comfortable writing environment
              </div>
            </div>

            {/* Feature 5: Word Limits */}
            <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100">
              <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center mb-6">
                <Target className="h-6 w-6 text-red-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">
                Word Limit Management
              </h3>
              <p className="text-gray-600 mb-4">
                Stay within college application word limits with real-time word counting and progress indicators.
              </p>
              <div className="text-sm text-gray-500">
                ✓ Real-time word counting<br/>
                ✓ Limit notifications<br/>
                ✓ Progress indicators
              </div>
            </div>

            {/* Feature 6: Multiple Essays */}
            <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100">
              <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center mb-6">
                <Star className="h-6 w-6 text-yellow-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">
                Multiple Essay Types
              </h3>
              <p className="text-gray-600 mb-4">
                Support for various essay types including personal statements, supplemental essays, and cover letters.
              </p>
              <div className="text-sm text-gray-500">
                ✓ Personal statements<br/>
                ✓ Supplemental essays<br/>
                ✓ Cover letters
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20 bg-primary-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Powered by advanced AI technology
            </h2>
            <p className="text-xl text-gray-600">
              WordWise delivers industry-leading accuracy and performance for student writers
            </p>
          </div>
          
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="text-4xl font-bold text-primary-600 mb-2">85%+</div>
              <div className="text-gray-600">Grammar accuracy</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-primary-600 mb-2">&lt;2s</div>
              <div className="text-gray-600">Response time</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-primary-600 mb-2">Real-time</div>
              <div className="text-gray-600">Suggestions</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-primary-600 mb-2">Smart</div>
              <div className="text-gray-600">Style analysis</div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gray-900">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-6">
            Ready to write your best personal statement?
          </h2>
          <p className="text-xl text-gray-300 mb-10">
            Join students who are using WordWise to organize their essays and stay on top of their college applications.
          </p>
          <Link
            to="/signup"
            className="inline-flex items-center px-8 py-4 bg-primary-600 text-white text-lg font-semibold rounded-lg hover:bg-primary-700 transition-colors"
          >
            <PenTool className="h-5 w-5 mr-2" />
            Start Writing for Free
          </Link>
        </div>
      </section>
    </div>
  )
} 