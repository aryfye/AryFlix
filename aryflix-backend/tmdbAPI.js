// Import axios for making HTTP requests to external APIs
const axios = require('axios');

// Get API keys from .env file
const TMDB_API_KEY = process.env.TMDB_API_KEY;
const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;

// Base URLs for APIs
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const YOUTUBE_BASE_URL = 'https://www.googleapis.com/youtube/v3';

// Create axios instance with default configuration for TMDB
// Sets up common headers and base URL for all TMDB requests 
const tmdbApi = axios.create({
    baseURL: TMDB_BASE_URL,
    params: {
      api_key: TMDB_API_KEY, // Add API key to every request automatically
    },
    timeout: 10000, // Set 10 second timeout for requests
});

// Create YouTube API instance
const youtubeApi = axios.create({
    baseURL: YOUTUBE_BASE_URL,
    params: {
        key: YOUTUBE_API_KEY
    },
    timeout: 10000
});

// List of TMDB genre IDs to exclude (optional, remove this if you want everything)
const EXCLUDED_GENRE_IDS = [10767, 10763, 10764]; // Talk, News, Reality

// Function to get trending movies for Hero Section
// Fetches current trending movies from TMDB API
// Returns an array of movie objects with relevant details
const getTrendingMovies = async () => {
    try {
        // Make get request to TMDB trending movies endpoint
        const response =  await tmdbApi.get('/trending/movie/day');
        // Return just the rsults array from the response
        return response.data.results;
    } catch (error) {
        // Log error details for debugging
        console.error('Error fetching trending movies:', error.message);
        // Rethrow error so calling function can handle it
        throw new Error('Failed to fetch trending movies');
    }
};








// Function to get trending TV shows for Hero Section 
// Fetches current trendning TV shows from TMDB
const getTrendingTVShows = async () => {
    try {
        // Make GET request to TIMDB trending TV endpoint
        const response = await tmdbApi.get('/trending/tv/day');
        // Return just the results array from the response
        return response.data.results;
    } catch (error) {
        // Log error details for debugging
        console.error('Error fetching trending TV shows:', error.message);
        // Rethrow error so calling function can handle it
        throw new Error('Failed to fetch trending TV shows');
    }
};









// Function to get movies currently playing in theatres
// Fetches movies that are currently showing in cinemas in theatres 
const getNowPlayingMovies = async () => {
    try {
        // Make GET request to TMDB "Now Playing" endpoint
        const response = await tmdbApi.get('/movie/now_playing');
        // Return just the results array from the response
        return response.data.results;
    } catch (error) {
        // Log error details for debugging
        console.error('Error fetching now playing movies:', error.message);
        // Rethrow error so calling function can handle it
        throw new Error('Failed to fetch now playing movies');
    }
};









// Function to get TV shows for "Watch At Home" section
// Combines trending and popular TV shows to show what people are actually watching at home
const getPopularTVShows = async () => {
    try {
        // Fetch trending and popular TV shows
        const [trendingResponse, popularResponse] = await Promise.all([
            tmdbApi.get('/trending/tv/week'),
            tmdbApi.get('/tv/popular')
        ]);
        
        // Get trending shows (first 10)
        const trendingShows = trendingResponse.data.results.slice(0, 10);
        // Get popular shows (first 10) that aren't already in trending
        const popularShows = popularResponse.data.results
            .filter(show => !trendingShows.some(trending => trending.id === show.id))
            .slice(0, 10);
        // Combine them
        const combinedShows = [...trendingShows, ...popularShows].slice(0, 20);

        // (Optional) Fetch full details for genre filtering
        const detailedShows = await Promise.all(
            combinedShows.map(async (show) => {
                try {
                    const detailRes = await tmdbApi.get(`/tv/${show.id}`);
                    return { ...show, ...detailRes.data };
                } catch (err) {
                    console.error(`Failed to fetch details for show ID ${show.id}:`, err.message);
                    return show; // fallback to basic info if details fail
                }
            })
        );

        // (Optional) Filter out unwanted genres
        const filteredShows = detailedShows.filter(
            show =>
                show.genres &&
                !show.genres.some(genre => EXCLUDED_GENRE_IDS.includes(genre.id))
        );

        // Return up to 20 shows
        return filteredShows.slice(0, 20);
    } catch (error) {
        console.error('Error fetching TV shows for Watch At Home:', error.message);
        throw new Error('Failed to fetch TV shows for Watch At Home');
    }
};












// Function to get upcoming movies for "Coming Soon to Theatres" section
// Balanced approach - more movies but still truly upcoming
const getUpcomingMovies = async () => {
    try {
        console.log('🎬 Backend: Starting to fetch upcoming movies...');
        
        // Get current date dynamically
        const today = new Date();
        const todayString = today.toISOString().split('T')[0];
        
        // Calculate a slightly more lenient date range
        const oneWeekAgo = new Date(today);
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
        const pastWeekString = oneWeekAgo.toISOString().split('T')[0];
        
        // Make multiple API calls with different strategies
        const [upcomingPage1, upcomingPage2, discoverPage1, discoverPage2] = await Promise.all([
            // 1. TMDB upcoming - page 1
            tmdbApi.get('/movie/upcoming', { params: { page: 1 } }),
            
            // 2. TMDB upcoming - page 2 (more movies)
            tmdbApi.get('/movie/upcoming', { params: { page: 2 } }),
            
            // 3. Discover movies - page 1
            tmdbApi.get('/discover/movie', {
                params: {
                    'primary_release_date.gte': pastWeekString, // Include movies from past week
                    'sort_by': 'popularity.desc',
                    'vote_count.gte': 3, // Very low threshold
                    'page': 1
                }
            }),
            
            // 4. Discover movies - page 2
            tmdbApi.get('/discover/movie', {
                params: {
                    'primary_release_date.gte': pastWeekString,
                    'sort_by': 'release_date.desc', // Different sorting
                    'vote_count.gte': 3,
                    'page': 2
                }
            })
        ]);
        
        console.log(`🎬 Backend: TMDB upcoming page 1: ${upcomingPage1.data.results.length} movies`);
        console.log(`🎬 Backend: TMDB upcoming page 2: ${upcomingPage2.data.results.length} movies`);
        console.log(`🎬 Backend: TMDB discover page 1: ${discoverPage1.data.results.length} movies`);
        console.log(`🎬 Backend: TMDB discover page 2: ${discoverPage2.data.results.length} movies`);
        
        // Combine all sources
        const allMovies = [
            ...upcomingPage1.data.results,
            ...upcomingPage2.data.results,
            ...discoverPage1.data.results,
            ...discoverPage2.data.results
        ];
        
        console.log(`🎬 Backend: Total movies before deduplication: ${allMovies.length}`);
        
        // Remove duplicates based on movie ID
        const uniqueMovies = allMovies.filter((movie, index, self) => 
            index === self.findIndex(m => m.id === movie.id)
        );
        
        console.log(`🎬 Backend: Unique movies after deduplication: ${uniqueMovies.length}`);
        
        // More lenient filtering - include today and future
        const upcomingMovies = uniqueMovies.filter(movie => {
            if (!movie.release_date) return true; // Include movies without dates (might be upcoming)
            
            // Include movies releasing today or in the future
            return movie.release_date >= todayString;
        });
        
        console.log(`🎬 Backend: Movies releasing today or later: ${upcomingMovies.length}`);
        
        // Sort by popularity (biggest movies first)
        upcomingMovies.sort((a, b) => (b.popularity || 0) - (a.popularity || 0));
        
        // Log top movies for debugging
        console.log('🎬 Backend: Top 15 upcoming movies:');
        upcomingMovies.slice(0, 15).forEach((movie, index) => {
            if (movie.release_date) {
                const releaseDate = new Date(movie.release_date);
                const daysFromNow = Math.ceil((releaseDate - today) / (1000 * 60 * 60 * 24));
                const status = daysFromNow < 0 ? `${Math.abs(daysFromNow)} days ago` : 
                             daysFromNow === 0 ? 'Today' : 
                             `${daysFromNow} days away`;
                console.log(`  ${index + 1}. ${movie.title} (${movie.release_date}) - ${status} - Pop: ${Math.round(movie.popularity || 0)}`);
            } else {
                console.log(`  ${index + 1}. ${movie.title} (No date) - Pop: ${Math.round(movie.popularity || 0)}`);
            }
        });
        
        return upcomingMovies.slice(0, 20);
    } catch (error) {
        console.error('Error fetching upcoming movies:', error.message);
        throw new Error('Failed to fetch upcoming movies');
    }
};












// Function to get truly NEW & UPCOMING TV shows
// Completely dynamic - no hardcoded years
const getUpcomingTVShows = async () => {
    try {
        // Get current date dynamically
        const today = new Date();
        const currentYear = today.getFullYear();
        
        // Calculate dynamic date ranges
        const startOfLastYear = `${currentYear - 1}-01-01`; // Include last year for "recent" shows
        const endOfNextYear = `${currentYear + 1}-12-31`;   // Include next year for "upcoming" shows
        
        console.log(`📺 Searching for new shows from ${startOfLastYear} to ${endOfNextYear}`);
        
        // Look for truly new shows using dynamic dates
        const response = await tmdbApi.get('/discover/tv', {
            params: {
                'first_air_date.gte': startOfLastYear, // Dynamic: last year
                'first_air_date.lte': endOfNextYear,   // Dynamic: next year
                'sort_by': 'popularity.desc',
                'vote_count.gte': 20,
                'with_original_language': 'en'
            }
        });
        
        console.log(`📺 Found ${response.data.results.length} new TV shows`);
        
        return response.data.results.slice(0, 20);
    } catch (error) {
        console.error('Error fetching new TV shows:', error.message);
        throw new Error('Failed to fetch new TV shows');
    }
};













// Function to get trending anime for "Trending Anime" section
// Fetches actually trending TV shows and filters for anime
const getTrendingAnime = async () => {
    try {
        // Get trending TV shows for the week (more stable than daily)
        const trendingResponse = await tmdbApi.get('/trending/tv/week');
        
        // Filter the trending shows to find anime
        const animeShows = trendingResponse.data.results.filter(show => {
            // Check if it's likely anime based on multiple criteria
            const isAnimation = show.genre_ids && show.genre_ids.includes(16); // Animation genre
            const isJapanese = show.original_language === 'ja';
            const isFromJapan = show.origin_country && show.origin_country.includes('JP');
            
            // Show is considered anime if it matches any of these criteria
            return isAnimation && (isJapanese || isFromJapan);
        });
        
        console.log(`🔥 Found ${animeShows.length} trending anime from ${trendingResponse.data.results.length} trending shows`);
        
        // If we don't have enough trending anime, supplement with popular recent anime
        if (animeShows.length < 10) {
            console.log('📈 Supplementing with popular recent anime...');
            
            const supplementResponse = await tmdbApi.get('/discover/tv', {
                params: {
                    'with_genres': '16', // Animation genre ID
                    'with_origin_country': 'JP', // Japan origin for anime
                    'sort_by': 'popularity.desc', // Sort by popularity
                    'first_air_date.gte': '2020-01-01', // Only recent anime (2020+)
                    'vote_count.gte': 100, // Decent vote count
                    'with_original_language': 'ja' // Japanese language
                }
            });
            
            // Add popular recent anime that aren't already in our trending list
            const existingIds = new Set(animeShows.map(anime => anime.id));
            const supplementAnime = supplementResponse.data.results.filter(anime => 
                !existingIds.has(anime.id)
            );
            
            animeShows.push(...supplementAnime);
            console.log(`📺 Added ${supplementAnime.length} popular recent anime`);
        }
        
        // Sort by a combination of trending rank and popularity
        animeShows.sort((a, b) => {
            // Prioritize items that were actually in trending
            const aInTrending = trendingResponse.data.results.find(item => item.id === a.id);
            const bInTrending = trendingResponse.data.results.find(item => item.id === b.id);
            
            if (aInTrending && !bInTrending) return -1;
            if (!aInTrending && bInTrending) return 1;
            
            // Both or neither in trending, sort by popularity
            return (b.popularity || 0) - (a.popularity || 0);
        });
        
        const finalAnime = animeShows.slice(0, 20);
        console.log('🍃 Final trending anime:', finalAnime.slice(0, 5).map(a => a.name));
        
        return finalAnime;
    } catch (error) {
        console.error('Error fetching trending anime:', error.message);
        throw new Error('Failed to fetch trending anime');
    }
};











// Function to get content from streaming platforms
// Generic function that can handle different streaming platforms by provider ID
const getStreamingPlatformContent = async (providerId, platformName) => {
    try {
        console.log(`${getEmoji(platformName)} Fetching content for ${platformName}...`);
        
        // Make same requests for movies and TV shows from the platform
        const [movieResponse, tvResponse] = await Promise.all([
            tmdbApi.get('/discover/movie', {
                params: {
                    'with_watch_providers': providerId,
                    'watch_region': 'US',
                    'sort_by': 'vote_average.desc',      // Sort by rating instead
                    'vote_count.gte': getVoteThreshold(platformName, 'movie'), // Dynamic threshold
                    'vote_average.gte': 7.0,             // Only highly rated movies
                    'primary_release_date.gte': '2000-01-01', // Include Breaking Bad era movies
                    'with_original_language': 'en'
                }
            }),
            tmdbApi.get('/discover/tv', {
                params: {
                    'with_watch_providers': providerId,
                    'watch_region': 'US',
                    'sort_by': 'vote_average.desc',      // Sort by rating instead
                    'vote_count.gte': 100,               // Lower threshold
                    'vote_average.gte': 7.0,             // Only highly rated shows
                    'first_air_date.gte': '2000-01-01',  // Include Breaking Bad era (2008-2013)
                    'with_original_language': 'en'
                }
            })
        ]);
        
        // Combine movies and TV shows
        const movies = movieResponse.data.results.map(item => ({...item, media_type: 'movie'}));
        const tvShows = tvResponse.data.results.map(item => ({...item, media_type: 'tv'}));
        const combinedContent = [...movies, ...tvShows];
        
        // Sort by a combination of rating and popularity
        combinedContent.sort((a, b) => {
            const scoreA = (a.vote_average * 0.6) + (Math.log(a.popularity) * 0.4);
            const scoreB = (b.vote_average * 0.6) + (Math.log(b.popularity) * 0.4);
            return scoreB - scoreA;
        });
        
        console.log(`${getEmoji(platformName)} Found ${combinedContent.length} quality titles`);
        console.log(`${getEmoji(platformName)} Top 3:`, combinedContent.slice(0, 3).map(item => 
            `${item.title || item.name} (${item.vote_average}/10)`
        ));
        
        return combinedContent.slice(0, 20);
        
    } catch (error) {
        console.error(`Error fetching ${platformName} content:`, error.message);
        throw new Error(`Failed to fetch ${platformName} content`);
    }
};

// Helper function to get emoji for each platform
const getEmoji = (platformName) => {
    const emojis = {
        'Netflix': '🔴',
        'Prime Video': '📦',
        'Disney+': '🏰',
        'Max': '🎭',
        'Apple TV+': '🍎'
    };
    return emojis[platformName] || '📺';
};

// Helper function to get vote thresholds (some platforms have smaller libraries)
const getVoteThreshold = (platformName, contentType) => {
    if (platformName === 'Apple TV+') {
        return contentType === 'movie' ? 50 : 25; // Lower for Apple TV+ (smaller library)
    }
    return contentType === 'movie' ? 100 : 50; // Standard thresholds
};

// Specific functions for each platform (cleaner API)
const getNetflixContent = () => getStreamingPlatformContent('8', 'Netflix');
const getPrimeVideoContent = () => getStreamingPlatformContent('9', 'Prime Video');
const getDisneyPlusContent = () => getStreamingPlatformContent('337', 'Disney+');
const getMaxContent = () => getStreamingPlatformContent('1899', 'Max');
const getAppleTVContent = () => getStreamingPlatformContent('350', 'Apple TV+');

// Function to get streaming provider logos
const getStreamingProviderLogos = async () => {
    try {
        console.log('🎯 Fetching streaming provider logos from TMDB...');
        
        // Get all movie providers (which includes the main streaming platforms)
        const response = await tmdbApi.get('/watch/providers/movie', {
            params: {
                'watch_region': 'US'
            }
        });

        // Map provider IDs to their data for quick lookup
        const providerMap = {};
        response.data.results.forEach(provider => {
            providerMap[provider.provider_id] = {
                id: provider.provider_id,
                name: provider.provider_name,
                logo_path: provider.logo_path,
                display_priority: provider.display_priority
            };
        });

        // Showing main supported platforms with their TMDB provider IDs
        const supportedPlatforms = {
            'netflix': 8,
            'prime': 9,
            'disney': 337,
            'max': 1899,
            'appletv': 350
        };

        // Build response with logos for our supported platforms
        const platformLogos = {};
        for (const [platformKey, providerId] of Object.entries(supportedPlatforms)) {
            const provider = providerMap[providerId];
            if (provider && provider.logo_path) {
                platformLogos[platformKey] = {
                    name: provider.name,
                    logo_path: provider.logo_path,
                    logo_url: `https://image.tmdb.org/t/p/original${provider.logo_path}`
                };
            }
        }

        console.log('✅ Successfully fetched streaming provider logos');
        return platformLogos;
        
    } catch (error) {
        console.error('Error fetching streaming provider logos:', error.message);
        throw new Error('Failed to fetch streaming provider logos');
    }
};





// Function to get detailed information for a specific movie
const getMovieDetails = async (movieId) => {
    try {
        console.log(`🎬 Fetching details for movie ID: ${movieId}`);
        
        // Get movie details with additional info (credits, videos, etc.)
        const response = await tmdbApi.get(`/movie/${movieId}`, {
            params: {
                'append_to_response': 'credits,videos,watch/providers,release_dates,keywords,production_companies'
            }
        });
        
        console.log(`✅ Successfully fetched details for: ${response.data.title}`);
        return response.data;
    } catch (error) {
        console.error(`Error fetching movie details for ID ${movieId}:`, error.message);
        throw new Error(`Failed to fetch movie details for ID ${movieId}`);
    }
};







// Function to get detailed information for a specific TV show
const getTVDetails = async (tvId) => {
    try {
        console.log(`📺 Fetching details for TV show ID: ${tvId}`);
        
        // Get both show details and season 1 credits
        const [showResponse, season1Response] = await Promise.all([
            tmdbApi.get(`/tv/${tvId}`, {
                params: {
                    'append_to_response': 'credits,videos,watch/providers,content_ratings'
                }
            }),
            // Also get season 1 credits
            tmdbApi.get(`/tv/${tvId}/season/1`, {
                params: {
                    'append_to_response': 'credits'
                }
            }).catch(error => {
                console.log(`⚠️ Could not fetch season 1 credits for ${tvId}`);
                return null;
            })
        ]);
        
        const tvData = showResponse.data;
        const seasonData = season1Response?.data;
        
        // Combine show credits with season credits
        const showCast = tvData.credits?.cast || [];
        const seasonCast = seasonData?.credits?.cast || [];
        
        // Merge and deduplicate cast
        const castMap = new Map();
        
        showCast.forEach(person => {
            castMap.set(person.id, person);
        });
        
        seasonCast.forEach(person => {
            castMap.set(person.id, person);
        });
        
        // Convert back to array (let frontend handle sorting)
        const combinedCast = Array.from(castMap.values());
        
        // Update the credits with combined cast
        if (!tvData.credits) tvData.credits = {};
        tvData.credits.cast = combinedCast;
        
        console.log(`✅ Successfully fetched details for: ${tvData.name}`);
        return tvData;
    } catch (error) {
        console.error(`Error fetching TV details for ID ${tvId}:`, error.message);
        throw new Error(`Failed to fetch TV details for ID ${tvId}`);
    }
};









// ===============================================
// NEW ENHANCED TRAILER FUNCTIONS WITH YOUTUBE FALLBACK
// ===============================================

// Enhanced function to get movie details with intelligent trailer fallback
const getMovieDetailsWithTrailer = async (movieId) => {
    try {
        console.log(`🎬 Fetching details and trailer for movie ID: ${movieId}`);
        
        // Get movie details with additional info (credits, videos, etc.)
        const response = await tmdbApi.get(`/movie/${movieId}`, {
            params: {
                'append_to_response': 'credits,videos,watch/providers,release_dates,keywords,production_companies'
            }
        });
        
        const movieData = response.data;
        
        // Remove all the complex poster searching code!
        // Frontend will handle poster consistency
        
        // Try to get trailer from TMDB first
        const tmdbTrailer = getValidTMDBTrailer(movieData.videos?.results || []);
        
        if (tmdbTrailer) {
            console.log(`✅ Found TMDB trailer for: ${movieData.title}`);
            movieData.trailer = {
                source: 'tmdb',
                key: tmdbTrailer.key,
                name: tmdbTrailer.name,
                site: tmdbTrailer.site,
                url: `https://www.youtube.com/watch?v=${tmdbTrailer.key}`
            };
        } else {
            console.log(`⚠️ No valid TMDB trailer found for: ${movieData.title}, trying YouTube...`);
            
            // Fallback to YouTube API
            const youtubeTrailer = await searchYouTubeTrailer(movieData.title, movieData.release_date, 'movie');
            
            if (youtubeTrailer) {
                console.log(`✅ Found YouTube trailer for: ${movieData.title}`);
                movieData.trailer = {
                    source: 'youtube',
                    key: youtubeTrailer.id.videoId,
                    name: youtubeTrailer.snippet.title,
                    site: 'YouTube',
                    url: `https://www.youtube.com/watch?v=${youtubeTrailer.id.videoId}`
                };
            } else {
                console.log(`❌ No trailer found anywhere for: ${movieData.title}`);
                movieData.trailer = null;
            }
        }
        
        return movieData;
    } catch (error) {
        console.error(`Error fetching movie details for ID ${movieId}:`, error.message);
        throw new Error(`Failed to fetch movie details for ID ${movieId}`);
    }
};







// Enhanced function to get TV show details with intelligent trailer fallback
const getTVDetailsWithTrailer = async (tvId) => {
    try {
        console.log(`📺 Fetching details and trailer for TV show ID: ${tvId}`);
        
        // Get basic TV show details - ADD production_companies for TV shows too!
        const tvResponse = await tmdbApi.get(`/tv/${tvId}`, {
            params: {
                'append_to_response': 'credits,videos,watch/providers,content_ratings,keywords,external_ids,networks,production_companies'
            }
        });

        const tvData = tvResponse.data;

        // Calculate average runtime from all episodes, skipping specials (season 0)
        if (tvData.seasons) {
            const allRuntimes = [];
            for (const season of tvData.seasons) {
                if (season.season_number === 0) continue; // Skip specials
                const seasonResponse = await tmdbApi.get(`/tv/${tvId}/season/${season.season_number}`);
                const validRuntimes = seasonResponse.data.episodes
                    .map(ep => ep.runtime)
                    .filter(runtime => runtime && runtime > 0);
                allRuntimes.push(...validRuntimes);
            }
            if (allRuntimes.length > 0) {
                const avgRuntime = Math.round(allRuntimes.reduce((a, b) => a + b, 0) / allRuntimes.length);
                tvData.episode_run_time = [avgRuntime];
            }
        }

        // Try to get trailer from TMDB first
        const tmdbTrailer = getValidTMDBTrailer(tvData.videos?.results || []);
        
        if (tmdbTrailer) {
            console.log(`✅ Found TMDB trailer for: ${tvData.name}`);
            tvData.trailer = {
                source: 'tmdb',
                key: tmdbTrailer.key,
                name: tmdbTrailer.name,
                site: tmdbTrailer.site,
                url: `https://www.youtube.com/watch?v=${tmdbTrailer.key}`
            };
        } else {
            console.log(`⚠️ No valid TMDB trailer found for: ${tvData.name}, trying YouTube...`);
            
            // Fallback to YouTube API
            const youtubeTrailer = await searchYouTubeTrailer(tvData.name, tvData.first_air_date, 'tv');
            
            if (youtubeTrailer) {
                console.log(`✅ Found YouTube trailer for: ${tvData.name}`);
                tvData.trailer = {
                    source: 'youtube',
                    key: youtubeTrailer.id.videoId,
                    name: youtubeTrailer.snippet.title,
                    site: 'YouTube',
                    url: `https://www.youtube.com/watch?v=${youtubeTrailer.id.videoId}`
                };
            } else {
                console.log(`❌ No trailer found anywhere for: ${tvData.name}`);
                tvData.trailer = null;
            }
        }

        return tvData;
    } catch (error) {
        console.error(`Error fetching TV details for ID ${tvId}:`, error.message);
        throw new Error(`Failed to fetch TV details for ID ${tvId}`);
    }
};









// Helper function to find a valid trailer from TMDB videos
const getValidTMDBTrailer = (videos) => {
    if (!videos || videos.length === 0) return null;
    
    // Filter for YouTube trailers only
    const youtubeVideos = videos.filter(video => video.site === 'YouTube');
    
    if (youtubeVideos.length === 0) return null;
    
    // Priority order for trailer selection
    const trailerPriorities = [
        video => video.type === 'Trailer' && video.name.toLowerCase().includes('official'),
        video => video.type === 'Trailer' && video.name.toLowerCase().includes('main'),
        video => video.type === 'Trailer',
        video => video.type === 'Teaser' && video.name.toLowerCase().includes('official'),
        video => video.type === 'Teaser'
    ];
    
    // Try each priority level
    for (const priorityCheck of trailerPriorities) {
        const foundTrailer = youtubeVideos.find(priorityCheck);
        if (foundTrailer) return foundTrailer;
    }
    
    // If no trailer or teaser found, return the first YouTube video
    return youtubeVideos[0] || null;
};







// Helper function to search YouTube Data API for trailers
const searchYouTubeTrailer = async (title, releaseDate, mediaType) => {
    try {
        if (!YOUTUBE_API_KEY) {
            console.log('⚠️ YouTube API key not found, skipping YouTube search');
            return null;
        }
        
        // Extract year from release date
        const year = releaseDate ? new Date(releaseDate).getFullYear() : '';
        
        // Create search query
        const queries = [
            `${title} ${year} official trailer`,
            `${title} ${year} trailer`,
            `${title} official trailer`,
            `${title} trailer`
        ];
        
        // Try each query until we find a good trailer
        for (const query of queries) {
            console.log(`🔍 Searching YouTube for: "${query}"`);
            
            const response = await youtubeApi.get('/search', {
                params: {
                    part: 'snippet',
                    q: query,
                    type: 'video',
                    maxResults: 10, // Increased from 5 to get more options
                    videoDefinition: 'high'
                }
            });
            
            if (response.data.items && response.data.items.length > 0) {
                // Find the best trailer from results
                const bestTrailer = findBestYouTubeTrailer(response.data.items, title, year);
                if (bestTrailer) return bestTrailer;
            }
        }
        
        return null;
    } catch (error) {
        console.error('Error searching YouTube for trailer:', error.message);
        return null;
    }
};









// Helper function to find the best trailer from YouTube search results
const findBestYouTubeTrailer = (videos, originalTitle, year) => {
    if (!videos || videos.length === 0) return null;
    
    // Score each video based on relevance
    const scoredVideos = videos.map(video => ({
        video,
        score: calculateTrailerScore(video, originalTitle, year)
    })).filter(item => item.score > 0);
    
    // Sort by score (highest first)
    scoredVideos.sort((a, b) => b.score - a.score);
    
    return scoredVideos.length > 0 ? scoredVideos[0].video : null;
};







// Helper function to calculate trailer relevance score
const calculateTrailerScore = (video, originalTitle, year) => {
    const title = video.snippet.title.toLowerCase();
    const description = video.snippet.description.toLowerCase();
    const channelName = video.snippet.channelTitle.toLowerCase();
    const originalTitleLower = originalTitle.toLowerCase();
    
    let score = 0;
    
    // Title similarity
    if (title.includes(originalTitleLower)) score += 10;
    
    // Year match
    if (year && (title.includes(year.toString()) || description.includes(year.toString()))) {
        score += 5;
    }
    
    // Official content indicators
    if (title.includes('official')) score += 8;
    if (title.includes('trailer')) score += 6;
    
    // Verified channels
    const officialChannels = ['netflix', 'hbo', 'amazon prime', 'disney', 'warner'];
    if (officialChannels.some(channel => channelName.includes(channel))) {
        score += 10;
    }
    
    // Negative indicators
    if (title.includes('reaction')) score -= 10;
    if (title.includes('review')) score -= 10;
    if (title.includes('fan made')) score -= 15;
    
    return score;
};

// Helper function to shuffle an array (Fisher-Yates shuffle)
const shuffleArray = (array) => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
};







const getWatchAtHomeContent = async () => {
    try {
        // Fetch from multiple pages to get more variety for randomization
        const randomPage1 = Math.floor(Math.random() * 3) + 1; // Pages 1-3
        const randomPage2 = Math.floor(Math.random() * 3) + 1; // Pages 1-3
        const randomPage3 = Math.floor(Math.random() * 5) + 1; // Pages 1-5 for anime (more variety)

        // Fetch top movies, TV shows, and anime from random pages
        const [moviesRes, tvRes, animeRes] = await Promise.all([
            tmdbApi.get('/discover/movie', {
                params: {
                    sort_by: 'vote_count.desc',
                    'vote_count.gte': 1000,
                    page: randomPage1,
                }
            }),
            tmdbApi.get('/discover/tv', {
                params: {
                    sort_by: 'vote_count.desc',
                    'vote_count.gte': 1000,
                    page: randomPage2,
                }
            }),
            tmdbApi.get('/discover/tv', {
                params: {
                    sort_by: 'vote_count.desc',
                    'vote_count.gte': 100,
                    with_genres: 16, // Animation
                    with_original_language: 'ja', // Japanese
                    page: randomPage3,
                }
            })
        ]);

        // Mark media type for frontend
        const addType = (arr, type) => arr.map(item => ({ ...item, media_type: type }));

        // Get and shuffle each category
        let movies = addType(moviesRes.data.results, 'movie');
        movies = shuffleArray(movies).slice(0, 15);

        const tvShowsRaw = addType(tvRes.data.results, 'tv');
        const tvShowsDetailed = await Promise.all(
            tvShowsRaw.map(async (item) => {
                try {
                    const detailRes = await tmdbApi.get(`/tv/${item.id}`);
                    return { ...item, ...detailRes.data };
                } catch {
                    return item;
                }
            })
        );
        let tvShows = tvShowsDetailed
            .filter(item => !(item.genres && item.genres.some(genre => EXCLUDED_GENRE_IDS.includes(genre.id))));
        tvShows = shuffleArray(tvShows).slice(0, 15);

        let anime = addType(animeRes.data.results, 'anime')
            .filter(item => item.original_language === 'ja');
        anime = shuffleArray(anime).slice(0, 10);

        // Combine all content and shuffle the final result
        const allContent = [...movies, ...tvShows, ...anime];
        const shuffledContent = shuffleArray(allContent);

        // Deduplicate
        const seen = new Set();
        const uniqueContent = [];
        for (const item of shuffledContent) {
            const key = `${item.media_type}-${item.id}`;
            if (!seen.has(key)) {
                seen.add(key);
                uniqueContent.push(item);
            }
        }

        console.log(`Watch At Home: Fetched from pages ${randomPage1}, ${randomPage2}, ${randomPage3} - returning ${uniqueContent.length} items`);
        
        // Return top 40 items
        return uniqueContent.slice(0, 40);
    } catch (error) {
        console.error('Error fetching Watch At Home content:', error.message);
        throw new Error('Failed to fetch Watch At Home content');
    }
};

// Add this function to tmdbAPI.js 

// Function to search for movies and TV shows
const searchMoviesAndTV = async (query) => {
    try {
        console.log(`🔍 Searching for: "${query}"`);
        
        // Search both movies and TV shows simultaneously
        const [moviesResponse, tvResponse] = await Promise.all([
            tmdbApi.get('/search/movie', {
                params: {
                    query: query,
                    include_adult: false,
                    language: 'en-US',
                    page: 1
                }
            }),
            tmdbApi.get('/search/tv', {
                params: {
                    query: query,
                    include_adult: false,
                    language: 'en-US',
                    page: 1
                }
            })
        ]);

        // Process movie results
        const movies = moviesResponse.data.results.map(movie => ({
            ...movie,
            media_type: 'movie',
            poster_path: movie.poster_path ? `https://image.tmdb.org/t/p/w500${movie.poster_path}` : null
        }));

        // Process TV show results
        const tvShows = tvResponse.data.results.map(show => ({
            ...show,
            media_type: 'tv',
            poster_path: show.poster_path ? `https://image.tmdb.org/t/p/w500${show.poster_path}` : null,
            title: show.name, // TV shows use 'name' instead of 'title'
            release_date: show.first_air_date // TV shows use 'first_air_date'
        }));

        // Combine results
        const allResults = [...movies, ...tvShows];

        // IMPROVED SORTING: Smart scoring that prioritizes popular content
        allResults.sort((a, b) => {
            // Calculate smart scores for both items
            const scoreA = calculateSmartScore(a.title, query, a.popularity, a.vote_average, a.vote_count);
            const scoreB = calculateSmartScore(b.title, query, b.popularity, b.vote_average, b.vote_count);
            
            return scoreB - scoreA; // Higher score = better result
        });

        console.log(`🔍 Found ${movies.length} movies and ${tvShows.length} TV shows`);
        
        return allResults.slice(0, 20); // Return top 20 results
    } catch (error) {
        console.error('Error searching movies and TV shows:', error.message);
        throw new Error('Failed to search content');
    }
};

// Helper function to calculate relevance score
const calculateRelevanceScore = (title, query) => {
    const titleLower = title.toLowerCase();
    const queryLower = query.toLowerCase();
    
    // Exact match gets highest score
    if (titleLower === queryLower) {
        return 1000;
    }
    
    // Title starts with query gets high score
    if (titleLower.startsWith(queryLower)) {
        return 800;
    }
    
    // Query is at the beginning of a word in title
    if (titleLower.includes(` ${queryLower}`)) {
        return 600;
    }
    
    // Title contains the full query
    if (titleLower.includes(queryLower)) {
        return 400;
    }
    
    // Calculate word match score
    const titleWords = titleLower.split(/\s+/);
    const queryWords = queryLower.split(/\s+/);
    let wordMatchScore = 0;
    
    queryWords.forEach(queryWord => {
        titleWords.forEach(titleWord => {
            if (titleWord === queryWord) {
                wordMatchScore += 100; // Exact word match
            } else if (titleWord.startsWith(queryWord) || queryWord.startsWith(titleWord)) {
                wordMatchScore += 50; // Partial word match
            }
        });
    });
    
    return wordMatchScore;
};

// Smart scoring function that balances relevance with popularity
// This fixes the problem where irrelevant but perfectly matched titles (like 1990 Captain America) 
// would rank higher than popular, well-known movies (like Civil War)
const calculateSmartScore = (title, query, popularity, rating, voteCount) => {
    const titleLower = title.toLowerCase();
    const queryLower = query.toLowerCase();
    
    // ===== POPULARITY SCORING (MAIN FACTOR - ~70% of total score) =====
    // This is the MOST IMPORTANT factor - ensures users see movies they've heard of
    // We use Math.log() to prevent extremely popular movies from completely dominating
    // Example: Movie with 1000 popularity gets ~345 points, movie with 100 gets ~230 points
    let score = Math.log(popularity || 1) * 50; // Multiply by 50 to make it the dominant factor
    
    // ===== QUALITY BONUS (MEDIUM FACTOR - ~20% of total score) =====
    // Movies that are both popular AND good get extra points
    // This prevents popular but terrible movies from ranking too high
    // Only movies with 100+ votes get this bonus (prevents fake ratings)
    if (rating && voteCount > 100) {
        score += (rating / 10) * 20; // 10/10 movie gets 20 extra points, 5/10 gets 10 points
    }
    
    // ===== RELEVANCE SCORING (SMALLER FACTOR - ~10% of total score) =====
    // This ensures the movie is actually related to what the user searched for
    // But it can't overcome terrible popularity + quality scores
    
    // Basic relevance: Does the title contain the search term?
    // Example: "Captain America: Civil War" contains "captain america" = +30 points
    if (titleLower.includes(queryLower)) {
        score += 30; // Good relevance bonus, but not overwhelming
        
        // EXACT MATCH BONUS: Perfect title match gets extra points
        // Example: Searching "avatar" and finding exactly "Avatar" = +20 more points
        if (titleLower === queryLower) {
            score += 20; // Reward exact matches
        }
        
        // STARTS WITH BONUS: Query at beginning of title gets extra points  
        // Example: "Star Wars" matches "Star Wars: A New Hope" = +15 more points
        if (titleLower.startsWith(queryLower)) {
            score += 15; // Reward titles that start with the search term
        }
    }
    
    // ===== WORD MATCHING BONUS (TINY FACTOR - ~5% of total score) =====
    // Count how many individual words from the search appear in the title
    // This helps with partial matches like "iron man" matching "Iron Man 3"
    const titleWords = titleLower.split(/\s+/);    // Split title into individual words
    const queryWords = queryLower.split(/\s+/);    // Split search into individual words
    let wordMatches = 0;
    
    // Check each search word against each title word
    queryWords.forEach(queryWord => {
        titleWords.forEach(titleWord => {
            // If words contain each other (like "america" and "american"), count it
            if (titleWord.includes(queryWord) || queryWord.includes(titleWord)) {
                wordMatches++; // Count this as a word match
            }
        });
    });
    
    score += wordMatches * 5; // Small bonus for each word match (5 points each)
    
    // ===== FINAL RESULT =====
    // Higher score = better search result
    // Popular + Good + Relevant movies will have the highest scores
    // Unpopular movies (like 1990 Captain America) will have low scores regardless of relevance
    return score;
};

// ===== EXAMPLE SCORES FOR "CAPTAIN AMERICA" SEARCH =====
// Captain America: Civil War
// - Popularity: Math.log(500) * 50 = ~310 points
// - Quality: (7.4/10) * 20 = ~15 points  
// - Relevance: Contains + starts with = 30 + 15 = 45 points
// - Word matches: 2 words * 5 = 10 points
// - TOTAL: ~380 points (WINNER!)

// Captain America (1990)
// - Popularity: Math.log(50) * 50 = ~195 points
// - Quality: (4.5/10) * 20 = ~9 points
// - Relevance: Exact match = 30 + 20 = 50 points  
// - Word matches: 2 words * 5 = 10 points
// - TOTAL: ~264 points (LOSER!)

// These functions will be imported in server.js to create API endpoints
module.exports = {
    getTrendingMovies,
    getTrendingTVShows,
    getNowPlayingMovies,
    getPopularTVShows,
    getUpcomingMovies,
    getUpcomingTVShows,
    getTrendingAnime,
    getNetflixContent,
    getPrimeVideoContent,
    getDisneyPlusContent,
    getMaxContent,
    getAppleTVContent,
    getStreamingProviderLogos,
    getMovieDetails,
    getTVDetails,
    getMovieDetailsWithTrailer,
    getTVDetailsWithTrailer,
    getWatchAtHomeContent,
    searchMoviesAndTV
};
