const MESSAGE_STYLES = {
    // Tone categories with performance metrics
    tones: {
        formal: {
            name: 'Formal',
            description: 'Professional and structured communication',
            avgResponseRate: 0.15,
            conversionRate: 0.08,
            bestFor: ['business_page']
        },
        
        casual: {
            name: 'Casual',
            description: 'Relaxed and conversational style',
            avgResponseRate: 0.22,
            conversionRate: 0.12,
            bestFor: ['personal_brand', 'creator']
        },
        
        friendly: {
            name: 'Friendly',
            description: 'Warm and personable communication',
            avgResponseRate: 0.28,
            conversionRate: 0.15,
            bestFor: ['personal_brand', 'creator']
        },
        
        professional: {
            name: 'Professional',
            description: 'Business-focused with expertise emphasis',
            avgResponseRate: 0.18,
            conversionRate: 0.10,
            bestFor: ['business_page']
        },
        
        humorous: {
            name: 'Humorous',
            description: 'Light-hearted with appropriate humor',
            avgResponseRate: 0.35,
            conversionRate: 0.08,
            bestFor: ['meme_page', 'creator']
        }
    },
    
    // Structure types for message organization
    structures: {
        short: {
            name: 'Short Form',
            description: 'Concise, direct messages',
            wordRange: '20-50',
            avgEngagement: 0.25
        },
        
        medium: {
            name: 'Medium Form',
            description: 'Balanced detail and brevity',
            wordRange: '50-150',
            avgEngagement: 0.20
        },
        
        long: {
            name: 'Long Form',
            description: 'Detailed, comprehensive messages',
            wordRange: '150-400',
            avgEngagement: 0.12
        },
        
        bullet: {
            name: 'Bullet Points',
            description: 'Structured, scannable format',
            avgEngagement: 0.18
        },
        
        question: {
            name: 'Question-Based',
            description: 'Engagement through inquiry',
            avgEngagement: 0.30
        }
    }
};
