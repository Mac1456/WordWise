import { ToneAnalysis } from '../services/textAnalysisService';

interface ToneAnalysisPanelProps {
  toneAnalysis: ToneAnalysis;
  onClose: () => void;
}

export default function ToneAnalysisPanel({ toneAnalysis, onClose }: ToneAnalysisPanelProps) {
  const getToneColor = (tone: ToneAnalysis['overall']) => {
    switch (tone) {
      case 'professional': return 'text-blue-600 bg-blue-50';
      case 'formal': return 'text-purple-600 bg-purple-50';
      case 'conversational': return 'text-green-600 bg-green-50';
      case 'passionate': return 'text-red-600 bg-red-50';
      case 'casual': return 'text-yellow-600 bg-yellow-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreIcon = (score: number) => {
    if (score >= 80) return (
      <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    );
    if (score >= 60) return (
      <svg className="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
      </svg>
    );
    return (
      <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
      </svg>
    );
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 max-h-[80vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-900">Tone Analysis</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Overall Tone */}
          <div className="mb-6">
            <h3 className="text-sm font-medium text-gray-700 mb-2">Overall Tone</h3>
            <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getToneColor(toneAnalysis.overall)}`}>
              {toneAnalysis.overall.charAt(0).toUpperCase() + toneAnalysis.overall.slice(1)}
            </div>
            <p className="text-xs text-gray-600 mt-2">
              {toneAnalysis.overall === 'professional' && 'Your writing sounds polished and appropriate for formal contexts.'}
              {toneAnalysis.overall === 'formal' && 'Your writing uses sophisticated language and structure.'}
              {toneAnalysis.overall === 'conversational' && 'Your writing feels personal and engaging.'}
              {toneAnalysis.overall === 'passionate' && 'Your writing conveys strong emotion and enthusiasm.'}
              {toneAnalysis.overall === 'casual' && 'Your writing is relaxed and informal.'}
              {toneAnalysis.overall === 'neutral' && 'Your writing maintains a balanced, objective tone.'}
            </p>
          </div>

          {/* Tone Metrics */}
          <div className="space-y-4 mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                {getScoreIcon(toneAnalysis.confidence)}
                <span className="text-sm font-medium text-gray-700">Confidence</span>
              </div>
              <span className={`text-sm font-semibold ${getScoreColor(toneAnalysis.confidence)}`}>
                {toneAnalysis.confidence}%
              </span>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                {getScoreIcon(toneAnalysis.sincerity)}
                <span className="text-sm font-medium text-gray-700">Sincerity</span>
              </div>
              <span className={`text-sm font-semibold ${getScoreColor(toneAnalysis.sincerity)}`}>
                {toneAnalysis.sincerity}%
              </span>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                {getScoreIcon(toneAnalysis.engagement)}
                <span className="text-sm font-medium text-gray-700">Engagement</span>
              </div>
              <span className={`text-sm font-semibold ${getScoreColor(toneAnalysis.engagement)}`}>
                {toneAnalysis.engagement}%
              </span>
            </div>
          </div>

          {/* Recommendations */}
          {toneAnalysis.recommendations.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-3 flex items-center">
                <svg className="w-4 h-4 mr-1 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
                Recommendations
              </h3>
              <div className="space-y-2">
                {toneAnalysis.recommendations.map((rec, index) => (
                  <div key={index} className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <p className="text-sm text-yellow-800">{rec}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Action Button */}
          <div className="mt-6 flex justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              Got it
            </button>
          </div>
        </div>
      </div>
    </div>
  );
} 