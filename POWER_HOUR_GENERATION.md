# 🎵 Power Hour Generation Feature

## Overview

The Power Hour Generation feature automatically creates complete 60-song playlists with 1-minute clips each, using advanced YouTube search and music similarity algorithms. This feature transforms the manual process of creating Power Hour playlists into an intelligent, automated experience.

## ✨ Key Features

### 🤖 Intelligent Generation Methods
- **Artist-based**: Start with your favorite artist and discover similar artists automatically
- **Keyword/Genre**: Generate playlists based on genres, moods, or descriptive terms
- **Mixed Search**: Combine artist names with keywords for refined results

### 🎯 Smart Music Discovery
- **Artist Similarity**: Uses Last.fm API to find musically related artists
- **Quality Filtering**: Prefers official videos and filters out low-quality content
- **Diversity Control**: Ensures variety by limiting clips per artist
- **Relevance Scoring**: Ranks videos by relevance to your search criteria

### ⚡ Advanced Configuration
- **Customizable Clip Count**: Generate 10-120 clips (default: 60)
- **Flexible Duration**: Set clip length from 30-120 seconds (default: 60)
- **Quality Filters**: Control video duration, official content preference
- **Artist Diversity**: Automatic or manual control over artist distribution

## 🚀 Getting Started

### Prerequisites

1. **Last.fm API Key** (Recommended for best results)
   - Visit [Last.fm API Account Creation](https://www.last.fm/api/account/create)
   - Create a free account and application
   - Copy your API key
   - Add to `.env` file: `VITE_LASTFM_API_KEY=your_api_key_here`

2. **yt-dlp Integration** (Already configured)
   - Provides unlimited YouTube access without API restrictions
   - Automatically handles video metadata extraction

### Basic Usage

1. **Navigate to YouTube V2 Page**
   - Click on "YouTube" in the main navigation
   - Select the "Auto Generate" tab

2. **Choose Generation Method**
   - **Artist-based**: Enter an artist name (e.g., "The Beatles")
   - **Keyword**: Add genres or moods (e.g., "rock", "party music", "2000s hits")
   - **Mixed**: Combine both (e.g., "Taylor Swift pop hits")

3. **Configure Settings** (Optional)
   - Adjust clip count and duration
   - Enable/disable similar artist discovery
   - Set quality preferences

4. **Generate Playlist**
   - Click "Generate Power Hour Playlist"
   - Monitor real-time progress
   - Preview and edit results
   - Save your playlist

## 🔧 Configuration Options

### Basic Settings
```typescript
{
  targetClipCount: 60,        // Number of clips to generate
  clipDuration: 60,           // Duration of each clip in seconds
  searchType: 'artist',       // 'artist' | 'keyword' | 'mixed'
  primaryArtist: 'The Beatles', // For artist-based generation
  keywords: ['rock', 'classic'], // For keyword-based generation
}
```

### Advanced Settings
```typescript
{
  includeRelatedArtists: true,    // Use music similarity
  maxRelatedArtists: 10,          // Limit similar artists
  preferOfficialVideos: true,     // Prefer official content
  excludeRemixes: false,          // Filter out remixes/covers
  ensureArtistDiversity: true,    // Limit clips per artist
  maxClipsPerArtist: 5,          // Max clips from one artist
  minVideoDuration: 120,          // Min video length (seconds)
  maxVideoDuration: 600,          // Max video length (seconds)
}
```

## 🎨 User Interface

### Generation Wizard
- **Step 1**: Choose generation method and input parameters
- **Step 2**: Configure advanced settings (optional)
- **Step 3**: Monitor real-time progress with detailed status
- **Step 4**: Preview generated clips with quality scores
- **Step 5**: Edit, remove, or replace clips as needed
- **Step 6**: Save playlist with custom name

### Progress Tracking
- Real-time step-by-step progress display
- Estimated time remaining
- Detailed status messages
- Cancellation support
- Error handling with helpful messages

### Results Preview
- Quality score and generation statistics
- Artist distribution visualization
- Individual clip relevance scores
- Thumbnail previews and metadata
- Edit/replace/remove functionality

## 🧠 How It Works

### 1. Search Strategy Building
```
Artist Input → Similar Artists Discovery → Search Query Generation
Keywords → Genre Expansion → Multiple Search Strategies
Mixed → Query Optimization → Fallback Searches
```

### 2. Music Similarity Discovery
```
Primary Artist → Last.fm API → Similar Artists List → Relevance Scoring
```

### 3. Video Search & Collection
```
Search Queries → yt-dlp Integration → Video Metadata → Quality Filtering
```

### 4. Intelligent Filtering
```
Duration Filters → Official Video Preference → Remix Detection → Relevance Scoring
```

### 5. Clip Generation
```
Video Selection → Smart Start Time → Clip Extraction → Diversity Balancing
```

## 📊 Quality Metrics

### Generation Quality Score
- **Excellent (80-100%)**: High relevance, good diversity, complete playlist
- **Good (60-79%)**: Decent relevance, some diversity issues
- **Fair (40-59%)**: Mixed quality, may need manual editing
- **Poor (0-39%)**: Low relevance, significant issues

### Factors Affecting Quality
- **Artist Similarity Service**: Last.fm API availability improves results significantly
- **Search Query Quality**: Specific artists/genres yield better results
- **YouTube Content Availability**: Popular artists have more high-quality content
- **Filter Settings**: Balanced settings produce better diversity

## 🛠️ Technical Implementation

### Architecture
```
PowerHourGenerator (UI) → PowerHourGeneratorService (Logic) → MusicSimilarityService (API)
                                    ↓
                            YouTubeUtils (Search) → yt-dlp (Video Data)
```

### Key Services
- **PowerHourGeneratorService**: Core generation logic and orchestration
- **MusicSimilarityService**: Last.fm API integration for artist discovery
- **YouTubeUtils**: Enhanced search with yt-dlp integration
- **Configuration Management**: Centralized settings and API key management

### Data Flow
1. User configures generation parameters
2. Service builds search strategy based on input type
3. Music similarity API discovers related artists (if enabled)
4. Multiple YouTube searches collect candidate videos
5. Intelligent filtering ranks and selects best videos
6. Clip extraction creates 1-minute segments
7. Quality scoring and diversity balancing
8. Results presented for user review and editing

## 🔍 Troubleshooting

### Common Issues

**"Music similarity service not available"**
- Solution: Configure Last.fm API key in `.env` file
- Impact: Generation will work but without related artist discovery

**"Generation failed: No videos found"**
- Solution: Try different search terms or broader keywords
- Check: Internet connection and yt-dlp functionality

**"Low quality score"**
- Solution: Use more specific artist names or popular genres
- Adjust: Filter settings to be less restrictive

**"Generation takes too long"**
- Solution: Reduce target clip count or max related artists
- Check: Network speed and Last.fm API rate limits

### Performance Optimization
- **Cache Management**: Similarity results cached for 24 hours
- **Rate Limiting**: Automatic delays prevent API throttling
- **Batch Processing**: Efficient video search and processing
- **Progress Feedback**: Real-time updates prevent UI freezing

## 🎯 Best Practices

### For Best Results
1. **Use Specific Artist Names**: "Taylor Swift" vs "pop music"
2. **Combine Methods**: Use mixed search for refined results
3. **Enable Similarity**: Configure Last.fm API for artist discovery
4. **Balanced Settings**: Don't over-restrict filters
5. **Review Results**: Use preview to fine-tune before saving

### Generation Tips
- **Popular Artists**: Generate faster and higher quality
- **Genre Keywords**: Use specific genres ("indie rock" vs "music")
- **Time Periods**: Include decades ("80s rock", "2000s pop")
- **Mood Descriptors**: Add energy levels ("upbeat", "chill", "party")

## 🔮 Future Enhancements

### Planned Features
- **Spotify Integration**: Additional music similarity source
- **Custom Templates**: Save and reuse generation configurations
- **Collaborative Generation**: Multi-user playlist creation
- **Advanced AI**: Machine learning for better relevance scoring
- **Playlist Analytics**: Detailed generation statistics and insights

### Community Features
- **Share Configurations**: Export/import generation settings
- **Template Library**: Community-contributed generation templates
- **Quality Ratings**: User feedback on generated playlists
- **Improvement Suggestions**: Crowdsourced enhancement ideas

## 📝 API Reference

### PowerHourGeneratorService
```typescript
generatePlaylist(config: PowerHourGenerationConfig): Promise<PowerHourGenerationResult>
cancelGeneration(): void
isGenerating(): boolean
getProgress(): GenerationProgress | null
```

### MusicSimilarityService
```typescript
getSimilarArtists(artist: string): Promise<SimilarArtist[]>
isAvailable(): boolean
getRateLimit(): { remaining: number; resetTime: number }
```

## 🤝 Contributing

We welcome contributions to improve the Power Hour Generation feature:

1. **Bug Reports**: Submit issues with detailed reproduction steps
2. **Feature Requests**: Suggest new generation methods or improvements
3. **Code Contributions**: Follow existing patterns and include tests
4. **Documentation**: Help improve this guide and inline documentation

## 📄 License

This feature is part of PHat5 and follows the same MIT license terms.
