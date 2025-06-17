-- WordWise Database Schema
-- Run this in your Supabase SQL editor

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create enums
CREATE TYPE writing_goal AS ENUM ('personal-statement', 'essay', 'cover-letter', 'email', 'other');
CREATE TYPE suggestion_type AS ENUM ('grammar', 'style', 'vocabulary', 'tone', 'conciseness', 'goal-alignment');
CREATE TYPE document_status AS ENUM ('draft', 'reviewing', 'complete', 'archived');
CREATE TYPE analysis_type AS ENUM ('grammar', 'tone', 'readability', 'style', 'goal-alignment');

-- Users table (extends auth.users)
CREATE TABLE public.users (
    id UUID REFERENCES auth.users(id) PRIMARY KEY,
    email TEXT NOT NULL,
    full_name TEXT,
    avatar_url TEXT,
    preferences JSONB DEFAULT '{
        "theme": "light",
        "notifications": true,
        "autoSave": true,
        "suggestionFrequency": "medium"
    }'::jsonb,
    writing_goals TEXT[] DEFAULT ARRAY['personal-statement'],
    improvement_tracking JSONB DEFAULT '{
        "grammarScore": 0,
        "styleScore": 0,
        "vocabularyScore": 0,
        "overallProgress": 0,
        "weeklyGoals": [],
        "achievements": []
    }'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Documents table
CREATE TABLE public.documents (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    content TEXT DEFAULT '',
    writing_goal writing_goal DEFAULT 'personal-statement',
    word_count INTEGER DEFAULT 0,
    readability_score DECIMAL,
    status document_status DEFAULT 'draft',
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Suggestions table
CREATE TABLE public.suggestions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    document_id UUID REFERENCES public.documents(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    type suggestion_type NOT NULL,
    text TEXT NOT NULL,
    replacement TEXT NOT NULL,
    explanation TEXT NOT NULL,
    position_start INTEGER NOT NULL,
    position_end INTEGER NOT NULL,
    confidence DECIMAL DEFAULT 0.5 CHECK (confidence >= 0 AND confidence <= 1),
    accepted BOOLEAN DEFAULT FALSE,
    dismissed BOOLEAN DEFAULT FALSE,
    feedback JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Analysis results table
CREATE TABLE public.analysis_results (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    document_id UUID REFERENCES public.documents(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    type analysis_type NOT NULL,
    results JSONB NOT NULL,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Analytics table
CREATE TABLE public.analytics (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL,
    event_data JSONB NOT NULL,
    document_id UUID REFERENCES public.documents(id) ON DELETE SET NULL,
    suggestion_id UUID REFERENCES public.suggestions(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_documents_user_id ON public.documents(user_id);
CREATE INDEX idx_documents_updated_at ON public.documents(updated_at);
CREATE INDEX idx_suggestions_document_id ON public.suggestions(document_id);
CREATE INDEX idx_suggestions_user_id ON public.suggestions(user_id);
CREATE INDEX idx_suggestions_type ON public.suggestions(type);
CREATE INDEX idx_analysis_results_document_id ON public.analysis_results(document_id);
CREATE INDEX idx_analytics_user_id ON public.analytics(user_id);
CREATE INDEX idx_analytics_event_type ON public.analytics(event_type);
CREATE INDEX idx_analytics_created_at ON public.analytics(created_at);

-- Triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_documents_updated_at BEFORE UPDATE ON public.documents
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_suggestions_updated_at BEFORE UPDATE ON public.suggestions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_analysis_results_updated_at BEFORE UPDATE ON public.analysis_results
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to create user profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.users (id, email, full_name)
    VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create user profile automatically
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to calculate word count automatically
CREATE OR REPLACE FUNCTION public.update_word_count()
RETURNS TRIGGER AS $$
BEGIN
    NEW.word_count = array_length(string_to_array(trim(NEW.content), ' '), 1);
    IF NEW.word_count IS NULL THEN
        NEW.word_count = 0;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_document_word_count
    BEFORE INSERT OR UPDATE ON public.documents
    FOR EACH ROW
    WHEN (NEW.content IS DISTINCT FROM OLD.content OR TG_OP = 'INSERT')
    EXECUTE FUNCTION public.update_word_count();

-- RLS Policies
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suggestions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analysis_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics ENABLE ROW LEVEL SECURITY;

-- Users policies
CREATE POLICY "Users can view own profile" ON public.users
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.users
    FOR UPDATE USING (auth.uid() = id);

-- Documents policies
CREATE POLICY "Users can view own documents" ON public.documents
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own documents" ON public.documents
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own documents" ON public.documents
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own documents" ON public.documents
    FOR DELETE USING (auth.uid() = user_id);

-- Suggestions policies
CREATE POLICY "Users can view own suggestions" ON public.suggestions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own suggestions" ON public.suggestions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own suggestions" ON public.suggestions
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own suggestions" ON public.suggestions
    FOR DELETE USING (auth.uid() = user_id);

-- Analysis results policies
CREATE POLICY "Users can view own analysis results" ON public.analysis_results
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own analysis results" ON public.analysis_results
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own analysis results" ON public.analysis_results
    FOR UPDATE USING (auth.uid() = user_id);

-- Analytics policies
CREATE POLICY "Users can view own analytics" ON public.analytics
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own analytics" ON public.analytics
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Database Functions for AI Processing
CREATE OR REPLACE FUNCTION public.analyze_text(
    content TEXT,
    writing_goal TEXT,
    user_preferences JSONB DEFAULT '{}'::jsonb
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result JSONB;
BEGIN
    -- This would call your AI service
    -- For now, return a placeholder structure
    result := jsonb_build_object(
        'grammar_score', 85,
        'style_score', 78,
        'tone_score', 82,
        'suggestions_count', 5,
        'overall_score', 81
    );
    
    RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_user_analytics(
    user_id UUID,
    start_date TIMESTAMPTZ DEFAULT NOW() - INTERVAL '30 days',
    end_date TIMESTAMPTZ DEFAULT NOW()
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result JSONB;
    document_count INTEGER;
    suggestion_count INTEGER;
    accepted_suggestions INTEGER;
    avg_word_count DECIMAL;
BEGIN
    -- Check if user is requesting their own analytics
    IF auth.uid() != user_id THEN
        RAISE EXCEPTION 'Access denied';
    END IF;
    
    -- Get analytics data
    SELECT COUNT(*) INTO document_count
    FROM public.documents 
    WHERE documents.user_id = get_user_analytics.user_id
    AND created_at BETWEEN start_date AND end_date;
    
    SELECT COUNT(*) INTO suggestion_count
    FROM public.suggestions 
    WHERE suggestions.user_id = get_user_analytics.user_id
    AND created_at BETWEEN start_date AND end_date;
    
    SELECT COUNT(*) INTO accepted_suggestions
    FROM public.suggestions 
    WHERE suggestions.user_id = get_user_analytics.user_id
    AND accepted = TRUE
    AND created_at BETWEEN start_date AND end_date;
    
    SELECT AVG(word_count) INTO avg_word_count
    FROM public.documents 
    WHERE documents.user_id = get_user_analytics.user_id
    AND created_at BETWEEN start_date AND end_date;
    
    result := jsonb_build_object(
        'document_count', document_count,
        'suggestion_count', suggestion_count,
        'accepted_suggestions', accepted_suggestions,
        'acceptance_rate', CASE 
            WHEN suggestion_count > 0 THEN (accepted_suggestions::DECIMAL / suggestion_count::DECIMAL * 100)
            ELSE 0 
        END,
        'avg_word_count', COALESCE(avg_word_count, 0),
        'period_start', start_date,
        'period_end', end_date
    );
    
    RETURN result;
END;
$$; 