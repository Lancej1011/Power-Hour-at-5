/**
 * Backup Music Discovery Service
 * Provides curated similar artist recommendations when Last.fm fails
 */

import { SimilarArtist } from '../types/powerHour';

// Comprehensive curated database of similar artists across all genres
const SIMILAR_ARTISTS_DB: Record<string, SimilarArtist[]> = {
  // === JAM BANDS ===
  'goose': [
    { name: 'Phish', similarity: 0.85, genres: ['jam band', 'rock'], tags: ['improvisational', 'psychedelic'] },
    { name: 'Widespread Panic', similarity: 0.82, genres: ['jam band', 'southern rock'], tags: ['improvisational', 'blues'] },
    { name: 'String Cheese Incident', similarity: 0.80, genres: ['jam band', 'bluegrass'], tags: ['improvisational', 'folk'] },
    { name: "Umphrey's McGee", similarity: 0.78, genres: ['jam band', 'progressive rock'], tags: ['improvisational', 'metal'] },
    { name: 'Trey Anastasio Band', similarity: 0.75, genres: ['jam band', 'rock'], tags: ['improvisational', 'psychedelic'] },
    { name: 'moe.', similarity: 0.73, genres: ['jam band', 'rock'], tags: ['improvisational', 'alternative'] },
    { name: 'The New Deal', similarity: 0.70, genres: ['jam band', 'electronic'], tags: ['improvisational', 'trance'] },
    { name: 'Lotus', similarity: 0.68, genres: ['jam band', 'electronic'], tags: ['improvisational', 'dance'] },
    { name: 'Disco Biscuits', similarity: 0.65, genres: ['jam band', 'electronic'], tags: ['improvisational', 'trance'] },
    { name: 'Pigeons Playing Ping Pong', similarity: 0.63, genres: ['jam band', 'funk'], tags: ['improvisational', 'psychedelic'] },
    { name: 'Spafford', similarity: 0.60, genres: ['jam band', 'rock'], tags: ['improvisational', 'progressive'] },
    { name: 'Aqueous', similarity: 0.58, genres: ['jam band', 'rock'], tags: ['improvisational', 'progressive'] },
    { name: 'Dopapod', similarity: 0.55, genres: ['jam band', 'electronic'], tags: ['improvisational', 'funk'] },
    { name: 'Tauk', similarity: 0.53, genres: ['jam band', 'instrumental'], tags: ['improvisational', 'progressive'] },
    { name: 'Lettuce', similarity: 0.50, genres: ['funk', 'jam band'], tags: ['improvisational', 'soul'] }
  ],

  'phish': [
    { name: 'Grateful Dead', similarity: 0.90, genres: ['jam band', 'rock'], tags: ['improvisational', 'psychedelic'] },
    { name: 'Goose', similarity: 0.85, genres: ['jam band', 'rock'], tags: ['improvisational', 'psychedelic'] },
    { name: 'Widespread Panic', similarity: 0.83, genres: ['jam band', 'southern rock'], tags: ['improvisational', 'blues'] },
    { name: 'String Cheese Incident', similarity: 0.80, genres: ['jam band', 'bluegrass'], tags: ['improvisational', 'folk'] },
    { name: "Umphrey's McGee", similarity: 0.78, genres: ['jam band', 'progressive rock'], tags: ['improvisational', 'metal'] },
    { name: 'moe.', similarity: 0.75, genres: ['jam band', 'rock'], tags: ['improvisational', 'alternative'] },
    { name: 'The New Deal', similarity: 0.70, genres: ['jam band', 'electronic'], tags: ['improvisational', 'trance'] },
    { name: 'Disco Biscuits', similarity: 0.68, genres: ['jam band', 'electronic'], tags: ['improvisational', 'trance'] },
    { name: 'Lotus', similarity: 0.65, genres: ['jam band', 'electronic'], tags: ['improvisational', 'dance'] },
    { name: 'Spafford', similarity: 0.63, genres: ['jam band', 'rock'], tags: ['improvisational', 'progressive'] }
  ],

  'grateful dead': [
    { name: 'Phish', similarity: 0.90, genres: ['jam band', 'rock'], tags: ['improvisational', 'psychedelic'] },
    { name: 'Jerry Garcia Band', similarity: 0.85, genres: ['jam band', 'rock'], tags: ['improvisational', 'blues'] },
    { name: 'Widespread Panic', similarity: 0.80, genres: ['jam band', 'southern rock'], tags: ['improvisational', 'blues'] },
    { name: 'String Cheese Incident', similarity: 0.75, genres: ['jam band', 'bluegrass'], tags: ['improvisational', 'folk'] },
    { name: 'Dark Star Orchestra', similarity: 0.70, genres: ['jam band', 'rock'], tags: ['improvisational', 'tribute'] },
    { name: 'Goose', similarity: 0.68, genres: ['jam band', 'rock'], tags: ['improvisational', 'psychedelic'] }
  ],

  // === POP MUSIC ===
  'taylor swift': [
    { name: 'Olivia Rodrigo', similarity: 0.85, genres: ['pop', 'alternative'], tags: ['singer-songwriter', 'indie pop'] },
    { name: 'Ariana Grande', similarity: 0.80, genres: ['pop', 'r&b'], tags: ['contemporary', 'dance pop'] },
    { name: 'Billie Eilish', similarity: 0.75, genres: ['pop', 'alternative'], tags: ['indie pop', 'electropop'] },
    { name: 'Dua Lipa', similarity: 0.73, genres: ['pop', 'dance'], tags: ['dance pop', 'electropop'] },
    { name: 'Lorde', similarity: 0.70, genres: ['pop', 'alternative'], tags: ['indie pop', 'electropop'] },
    { name: 'Katy Perry', similarity: 0.68, genres: ['pop', 'dance'], tags: ['dance pop', 'electropop'] },
    { name: 'Ed Sheeran', similarity: 0.65, genres: ['pop', 'folk'], tags: ['singer-songwriter', 'acoustic'] },
    { name: 'Selena Gomez', similarity: 0.63, genres: ['pop', 'dance'], tags: ['dance pop', 'latin pop'] },
    { name: 'Miley Cyrus', similarity: 0.60, genres: ['pop', 'rock'], tags: ['pop rock', 'country pop'] },
    { name: 'Halsey', similarity: 0.58, genres: ['pop', 'alternative'], tags: ['indie pop', 'electropop'] }
  ],

  'ariana grande': [
    { name: 'Taylor Swift', similarity: 0.80, genres: ['pop', 'country'], tags: ['singer-songwriter', 'pop country'] },
    { name: 'Dua Lipa', similarity: 0.78, genres: ['pop', 'dance'], tags: ['dance pop', 'electropop'] },
    { name: 'The Weeknd', similarity: 0.75, genres: ['r&b', 'pop'], tags: ['contemporary r&b', 'alternative r&b'] },
    { name: 'Billie Eilish', similarity: 0.73, genres: ['pop', 'alternative'], tags: ['indie pop', 'electropop'] },
    { name: 'Olivia Rodrigo', similarity: 0.70, genres: ['pop', 'alternative'], tags: ['singer-songwriter', 'indie pop'] },
    { name: 'Selena Gomez', similarity: 0.68, genres: ['pop', 'dance'], tags: ['dance pop', 'latin pop'] },
    { name: 'Katy Perry', similarity: 0.65, genres: ['pop', 'dance'], tags: ['dance pop', 'electropop'] },
    { name: 'Camila Cabello', similarity: 0.63, genres: ['pop', 'latin'], tags: ['latin pop', 'dance pop'] }
  ],

  // === HIP HOP / RAP ===
  'drake': [
    { name: 'Kendrick Lamar', similarity: 0.80, genres: ['hip hop', 'rap'], tags: ['conscious rap', 'west coast'] },
    { name: 'J. Cole', similarity: 0.78, genres: ['hip hop', 'rap'], tags: ['conscious rap', 'southern hip hop'] },
    { name: 'The Weeknd', similarity: 0.75, genres: ['r&b', 'pop'], tags: ['contemporary r&b', 'alternative r&b'] },
    { name: 'Future', similarity: 0.73, genres: ['hip hop', 'trap'], tags: ['southern hip hop', 'mumble rap'] },
    { name: 'Travis Scott', similarity: 0.70, genres: ['hip hop', 'trap'], tags: ['psychedelic rap', 'southern hip hop'] },
    { name: 'Post Malone', similarity: 0.68, genres: ['hip hop', 'pop'], tags: ['melodic rap', 'pop rap'] },
    { name: 'Lil Wayne', similarity: 0.65, genres: ['hip hop', 'rap'], tags: ['southern hip hop', 'hardcore hip hop'] },
    { name: 'Kanye West', similarity: 0.63, genres: ['hip hop', 'rap'], tags: ['conscious rap', 'experimental hip hop'] },
    { name: 'Big Sean', similarity: 0.60, genres: ['hip hop', 'rap'], tags: ['midwest hip hop', 'contemporary rap'] },
    { name: 'Tory Lanez', similarity: 0.58, genres: ['hip hop', 'r&b'], tags: ['melodic rap', 'contemporary r&b'] }
  ],

  'kendrick lamar': [
    { name: 'J. Cole', similarity: 0.85, genres: ['hip hop', 'rap'], tags: ['conscious rap', 'southern hip hop'] },
    { name: 'Drake', similarity: 0.80, genres: ['hip hop', 'r&b'], tags: ['contemporary rap', 'melodic rap'] },
    { name: 'Kanye West', similarity: 0.78, genres: ['hip hop', 'rap'], tags: ['conscious rap', 'experimental hip hop'] },
    { name: 'Tyler, The Creator', similarity: 0.75, genres: ['hip hop', 'alternative'], tags: ['alternative hip hop', 'experimental'] },
    { name: 'Childish Gambino', similarity: 0.73, genres: ['hip hop', 'r&b'], tags: ['alternative hip hop', 'funk'] },
    { name: 'Chance the Rapper', similarity: 0.70, genres: ['hip hop', 'gospel'], tags: ['conscious rap', 'gospel rap'] },
    { name: 'Joey Bada$$', similarity: 0.68, genres: ['hip hop', 'rap'], tags: ['east coast hip hop', 'boom bap'] },
    { name: 'Vince Staples', similarity: 0.65, genres: ['hip hop', 'rap'], tags: ['west coast hip hop', 'alternative hip hop'] }
  ],

  // === ROCK MUSIC ===
  'the beatles': [
    { name: 'The Rolling Stones', similarity: 0.85, genres: ['rock', 'classic rock'], tags: ['british invasion', 'blues'] },
    { name: 'Led Zeppelin', similarity: 0.80, genres: ['rock', 'hard rock'], tags: ['classic rock', 'blues'] },
    { name: 'The Who', similarity: 0.78, genres: ['rock', 'hard rock'], tags: ['british invasion', 'progressive'] },
    { name: 'Pink Floyd', similarity: 0.75, genres: ['rock', 'progressive rock'], tags: ['psychedelic', 'experimental'] },
    { name: 'The Kinks', similarity: 0.73, genres: ['rock', 'pop rock'], tags: ['british invasion', 'alternative'] },
    { name: 'The Beach Boys', similarity: 0.70, genres: ['pop', 'rock'], tags: ['surf rock', 'psychedelic'] },
    { name: 'Bob Dylan', similarity: 0.68, genres: ['folk', 'rock'], tags: ['singer-songwriter', 'folk rock'] },
    { name: 'The Byrds', similarity: 0.65, genres: ['folk rock', 'country rock'], tags: ['psychedelic', 'jangle pop'] }
  ],

  'led zeppelin': [
    { name: 'Black Sabbath', similarity: 0.85, genres: ['rock', 'heavy metal'], tags: ['hard rock', 'doom metal'] },
    { name: 'Deep Purple', similarity: 0.83, genres: ['rock', 'hard rock'], tags: ['classic rock', 'heavy metal'] },
    { name: 'The Rolling Stones', similarity: 0.80, genres: ['rock', 'classic rock'], tags: ['british invasion', 'blues'] },
    { name: 'AC/DC', similarity: 0.78, genres: ['rock', 'hard rock'], tags: ['classic rock', 'heavy metal'] },
    { name: 'The Who', similarity: 0.75, genres: ['rock', 'hard rock'], tags: ['british invasion', 'progressive'] },
    { name: 'Queen', similarity: 0.73, genres: ['rock', 'arena rock'], tags: ['classic rock', 'progressive'] },
    { name: 'Aerosmith', similarity: 0.70, genres: ['rock', 'hard rock'], tags: ['classic rock', 'blues rock'] },
    { name: 'The Beatles', similarity: 0.68, genres: ['rock', 'pop'], tags: ['british invasion', 'psychedelic'] }
  ],

  'queen': [
    { name: 'Led Zeppelin', similarity: 0.80, genres: ['rock', 'hard rock'], tags: ['classic rock', 'blues'] },
    { name: 'The Who', similarity: 0.78, genres: ['rock', 'hard rock'], tags: ['british invasion', 'progressive'] },
    { name: 'David Bowie', similarity: 0.75, genres: ['rock', 'glam rock'], tags: ['art rock', 'experimental'] },
    { name: 'Elton John', similarity: 0.73, genres: ['rock', 'pop'], tags: ['piano rock', 'glam rock'] },
    { name: 'The Rolling Stones', similarity: 0.70, genres: ['rock', 'classic rock'], tags: ['british invasion', 'blues'] },
    { name: 'AC/DC', similarity: 0.68, genres: ['rock', 'hard rock'], tags: ['classic rock', 'heavy metal'] },
    { name: 'Aerosmith', similarity: 0.65, genres: ['rock', 'hard rock'], tags: ['classic rock', 'blues rock'] }
  ],

  // Additional genre-based artists for better coverage
  'jazz': [
    { name: 'Miles Davis', similarity: 0.90, genres: ['jazz', 'bebop'], tags: ['trumpet', 'cool jazz'] },
    { name: 'John Coltrane', similarity: 0.88, genres: ['jazz', 'bebop'], tags: ['saxophone', 'spiritual jazz'] },
    { name: 'Bill Evans', similarity: 0.85, genres: ['jazz', 'cool jazz'], tags: ['piano', 'modal jazz'] },
    { name: 'Charlie Parker', similarity: 0.83, genres: ['jazz', 'bebop'], tags: ['saxophone', 'hard bop'] },
    { name: 'Thelonious Monk', similarity: 0.80, genres: ['jazz', 'bebop'], tags: ['piano', 'avant-garde'] }
  ],

  'blues': [
    { name: 'B.B. King', similarity: 0.90, genres: ['blues', 'electric blues'], tags: ['guitar', 'chicago blues'] },
    { name: 'Muddy Waters', similarity: 0.88, genres: ['blues', 'chicago blues'], tags: ['guitar', 'electric blues'] },
    { name: 'Robert Johnson', similarity: 0.85, genres: ['blues', 'delta blues'], tags: ['guitar', 'acoustic'] },
    { name: 'Howlin\' Wolf', similarity: 0.83, genres: ['blues', 'chicago blues'], tags: ['harmonica', 'electric blues'] },
    { name: 'Stevie Ray Vaughan', similarity: 0.80, genres: ['blues', 'texas blues'], tags: ['guitar', 'blues rock'] }
  ],

  // === ELECTRONIC / EDM ===
  'deadmau5': [
    { name: 'Skrillex', similarity: 0.80, genres: ['electronic', 'dubstep'], tags: ['edm', 'bass music'] },
    { name: 'Calvin Harris', similarity: 0.78, genres: ['electronic', 'house'], tags: ['edm', 'dance'] },
    { name: 'Avicii', similarity: 0.75, genres: ['electronic', 'house'], tags: ['edm', 'progressive house'] },
    { name: 'Tiësto', similarity: 0.73, genres: ['electronic', 'trance'], tags: ['edm', 'progressive trance'] },
    { name: 'David Guetta', similarity: 0.70, genres: ['electronic', 'house'], tags: ['edm', 'electro house'] },
    { name: 'Daft Punk', similarity: 0.68, genres: ['electronic', 'house'], tags: ['french house', 'disco'] },
    { name: 'Diplo', similarity: 0.65, genres: ['electronic', 'trap'], tags: ['edm', 'moombahton'] },
    { name: 'Zedd', similarity: 0.63, genres: ['electronic', 'electro house'], tags: ['edm', 'progressive house'] }
  ],

  'daft punk': [
    { name: 'Justice', similarity: 0.85, genres: ['electronic', 'house'], tags: ['french house', 'electro'] },
    { name: 'Moderat', similarity: 0.80, genres: ['electronic', 'techno'], tags: ['minimal techno', 'ambient'] },
    { name: 'Deadmau5', similarity: 0.78, genres: ['electronic', 'progressive house'], tags: ['edm', 'techno'] },
    { name: 'Chemical Brothers', similarity: 0.75, genres: ['electronic', 'big beat'], tags: ['breakbeat', 'acid house'] },
    { name: 'Fatboy Slim', similarity: 0.73, genres: ['electronic', 'big beat'], tags: ['breakbeat', 'house'] },
    { name: 'Basement Jaxx', similarity: 0.70, genres: ['electronic', 'house'], tags: ['uk garage', 'breakbeat'] },
    { name: 'Kraftwerk', similarity: 0.68, genres: ['electronic', 'synthpop'], tags: ['krautrock', 'experimental'] }
  ],

  // === COUNTRY MUSIC ===
  'johnny cash': [
    { name: 'Hank Williams', similarity: 0.85, genres: ['country', 'honky tonk'], tags: ['classic country', 'traditional'] },
    { name: 'Willie Nelson', similarity: 0.83, genres: ['country', 'outlaw country'], tags: ['folk', 'americana'] },
    { name: 'Waylon Jennings', similarity: 0.80, genres: ['country', 'outlaw country'], tags: ['rockabilly', 'honky tonk'] },
    { name: 'Merle Haggard', similarity: 0.78, genres: ['country', 'bakersfield sound'], tags: ['honky tonk', 'traditional'] },
    { name: 'Kris Kristofferson', similarity: 0.75, genres: ['country', 'folk'], tags: ['singer-songwriter', 'outlaw country'] },
    { name: 'George Jones', similarity: 0.73, genres: ['country', 'honky tonk'], tags: ['traditional country', 'classic'] },
    { name: 'Patsy Cline', similarity: 0.70, genres: ['country', 'pop'], tags: ['traditional country', 'crossover'] }
  ],

  // === ALTERNATIVE / INDIE ===
  'radiohead': [
    { name: 'Thom Yorke', similarity: 0.85, genres: ['alternative', 'electronic'], tags: ['experimental', 'art rock'] },
    { name: 'Coldplay', similarity: 0.75, genres: ['alternative', 'rock'], tags: ['britpop', 'post-britpop'] },
    { name: 'Muse', similarity: 0.73, genres: ['alternative', 'rock'], tags: ['progressive rock', 'space rock'] },
    { name: 'Arcade Fire', similarity: 0.70, genres: ['indie rock', 'alternative'], tags: ['art rock', 'baroque pop'] },
    { name: 'The National', similarity: 0.68, genres: ['indie rock', 'alternative'], tags: ['post-punk revival', 'art rock'] },
    { name: 'Vampire Weekend', similarity: 0.65, genres: ['indie rock', 'alternative'], tags: ['indie pop', 'afropop'] },
    { name: 'Bon Iver', similarity: 0.63, genres: ['indie folk', 'alternative'], tags: ['folktronica', 'art folk'] }
  ],

  // === R&B / SOUL ===
  'the weeknd': [
    { name: 'Frank Ocean', similarity: 0.85, genres: ['r&b', 'alternative'], tags: ['alternative r&b', 'neo soul'] },
    { name: 'Drake', similarity: 0.80, genres: ['hip hop', 'r&b'], tags: ['contemporary rap', 'melodic rap'] },
    { name: 'Ariana Grande', similarity: 0.78, genres: ['pop', 'r&b'], tags: ['contemporary', 'dance pop'] },
    { name: 'Bruno Mars', similarity: 0.75, genres: ['pop', 'r&b'], tags: ['funk', 'soul'] },
    { name: 'John Legend', similarity: 0.73, genres: ['r&b', 'soul'], tags: ['contemporary r&b', 'neo soul'] },
    { name: 'Miguel', similarity: 0.70, genres: ['r&b', 'alternative'], tags: ['alternative r&b', 'funk'] },
    { name: 'Daniel Caesar', similarity: 0.68, genres: ['r&b', 'soul'], tags: ['neo soul', 'alternative r&b'] }
  ],

  // === METAL / HARD ROCK ===
  'metallica': [
    { name: 'Iron Maiden', similarity: 0.85, genres: ['metal', 'heavy metal'], tags: ['nwobhm', 'power metal'] },
    { name: 'Black Sabbath', similarity: 0.83, genres: ['metal', 'heavy metal'], tags: ['doom metal', 'hard rock'] },
    { name: 'Megadeth', similarity: 0.80, genres: ['metal', 'thrash metal'], tags: ['speed metal', 'heavy metal'] },
    { name: 'Slayer', similarity: 0.78, genres: ['metal', 'thrash metal'], tags: ['speed metal', 'death metal'] },
    { name: 'Anthrax', similarity: 0.75, genres: ['metal', 'thrash metal'], tags: ['speed metal', 'hardcore'] },
    { name: 'Judas Priest', similarity: 0.73, genres: ['metal', 'heavy metal'], tags: ['nwobhm', 'speed metal'] },
    { name: 'Pantera', similarity: 0.70, genres: ['metal', 'groove metal'], tags: ['thrash metal', 'heavy metal'] }
  ],

  // === ADDITIONAL POPULAR ARTISTS ===
  'imagine dragons': [
    { name: 'OneRepublic', similarity: 0.80, genres: ['pop rock', 'alternative'], tags: ['arena rock', 'mainstream'] },
    { name: 'Maroon 5', similarity: 0.75, genres: ['pop rock', 'alternative'], tags: ['pop', 'mainstream'] },
    { name: 'Coldplay', similarity: 0.73, genres: ['alternative rock', 'pop rock'], tags: ['britpop', 'arena rock'] },
    { name: 'The Killers', similarity: 0.70, genres: ['alternative rock', 'indie rock'], tags: ['new wave', 'post-punk'] },
    { name: 'Fall Out Boy', similarity: 0.68, genres: ['pop punk', 'alternative rock'], tags: ['emo', 'pop rock'] },
    { name: 'Panic! At The Disco', similarity: 0.65, genres: ['pop rock', 'alternative'], tags: ['emo', 'theatrical'] }
  ],

  'foo fighters': [
    { name: 'Nirvana', similarity: 0.85, genres: ['grunge', 'alternative rock'], tags: ['seattle', '90s'] },
    { name: 'Pearl Jam', similarity: 0.83, genres: ['grunge', 'alternative rock'], tags: ['seattle', '90s'] },
    { name: 'Red Hot Chili Peppers', similarity: 0.80, genres: ['alternative rock', 'funk rock'], tags: ['california', 'funk'] },
    { name: 'Stone Temple Pilots', similarity: 0.78, genres: ['grunge', 'alternative rock'], tags: ['90s', 'hard rock'] },
    { name: 'Soundgarden', similarity: 0.75, genres: ['grunge', 'alternative metal'], tags: ['seattle', '90s'] },
    { name: 'Alice in Chains', similarity: 0.73, genres: ['grunge', 'alternative metal'], tags: ['seattle', '90s'] }
  ],

  'green day': [
    { name: 'Blink-182', similarity: 0.85, genres: ['pop punk', 'alternative rock'], tags: ['california', '90s'] },
    { name: 'The Offspring', similarity: 0.83, genres: ['punk rock', 'alternative rock'], tags: ['california', '90s'] },
    { name: 'Sum 41', similarity: 0.80, genres: ['pop punk', 'alternative rock'], tags: ['canadian', '2000s'] },
    { name: 'Good Charlotte', similarity: 0.78, genres: ['pop punk', 'alternative rock'], tags: ['emo', '2000s'] },
    { name: 'Simple Plan', similarity: 0.75, genres: ['pop punk', 'alternative rock'], tags: ['canadian', '2000s'] },
    { name: 'Fall Out Boy', similarity: 0.73, genres: ['pop punk', 'alternative rock'], tags: ['emo', 'chicago'] }
  ]
};

// Comprehensive popular songs database for all artists
const POPULAR_SONGS_DB: Record<string, string[]> = {
  // === JAM BANDS ===
  'phish': ['Wilson', 'You Enjoy Myself', 'Fluffhead', 'Harry Hood', 'Tweezer', 'Divided Sky', 'Run Like an Antelope'],
  'widespread panic': ['Chilly Water', 'Fishwater', 'Airplane', 'Porch Song', 'Tall Boy', 'Space Wrangler'],
  'string cheese incident': ['Black Clouds', 'Rollover', 'Born on the Wrong Planet', 'Jellyfish', 'Round the Wheel'],
  "umphrey's mcgee": ['All in Time', 'Divisions', 'The Triple Wide', 'Booth Love', 'Slacker', 'Roulette'],
  'grateful dead': ['Truckin', 'Touch of Grey', 'Casey Jones', 'Sugar Magnolia', 'Fire on the Mountain'],
  'moe.': ['Meat', 'Rebubula', 'Timmy Tucker', 'Brent Black', 'Nebraska', 'Captain America'],
  'disco biscuits': ['Helicopters', 'Basis for a Day', 'Mindless Dribble', 'Crickets', 'The Overture'],
  'lotus': ['Greet the Mind', 'Flower Sermon', 'Lucid Awakening', 'Spiritualize', 'Age of Inexperience'],
  'spafford': ['All In', 'Electric Taco Stand', 'Minds Unchained', 'The Postman', 'Bee Jam'],
  'aqueous': ['The Painting', 'Kitty Hawk', 'Origami', 'Underlyer', 'Color Wheel'],
  'pigeons playing ping pong': ['Melting Lights', 'Poseidon', 'Julia', 'Offshoot', 'Time to Ride'],
  'goose': ['Hungersite', 'Borne', 'Your Direction', 'Madhuvan', 'Arcadia', 'Tumble'],

  // === POP MUSIC ===
  'taylor swift': ['Shake It Off', 'Love Story', 'Blank Space', 'Anti-Hero', 'You Belong With Me', 'Bad Blood'],
  'ariana grande': ['Thank U Next', '7 rings', 'Problem', 'Break Free', 'Side to Side', 'Positions'],
  'billie eilish': ['Bad Guy', 'Happier Than Ever', 'Ocean Eyes', 'Lovely', 'Therefore I Am', 'When the Party\'s Over'],
  'dua lipa': ['Levitating', 'Don\'t Start Now', 'Physical', 'New Rules', 'One Kiss', 'Future Nostalgia'],
  'olivia rodrigo': ['Drivers License', 'Good 4 U', 'Vampire', 'Deja Vu', 'Brutal', 'Traitor'],
  'ed sheeran': ['Shape of You', 'Perfect', 'Thinking Out Loud', 'Photograph', 'Castle on the Hill', 'Bad Habits'],

  // === HIP HOP / RAP ===
  'drake': ['God\'s Plan', 'In My Feelings', 'Hotline Bling', 'One Dance', 'Started From the Bottom', 'Nice For What'],
  'kendrick lamar': ['HUMBLE.', 'DNA.', 'Swimming Pools', 'Alright', 'King Kunta', 'Money Trees'],
  'j. cole': ['No Role Modelz', 'Middle Child', 'GOMD', 'Work Out', 'Power Trip', 'ATM'],
  'kanye west': ['Stronger', 'Gold Digger', 'Heartless', 'Power', 'All of the Lights', 'Good Life'],
  'post malone': ['Circles', 'Sunflower', 'Rockstar', 'White Iverson', 'Congratulations', 'Better Now'],

  // === ROCK MUSIC ===
  'the beatles': ['Hey Jude', 'Let It Be', 'Yesterday', 'Come Together', 'Here Comes the Sun', 'Help!'],
  'led zeppelin': ['Stairway to Heaven', 'Whole Lotta Love', 'Kashmir', 'Black Dog', 'Rock and Roll', 'Immigrant Song'],
  'queen': ['Bohemian Rhapsody', 'We Will Rock You', 'We Are the Champions', 'Another One Bites the Dust', 'Somebody to Love', 'Don\'t Stop Me Now'],
  'the rolling stones': ['Paint It Black', 'Start Me Up', 'Satisfaction', 'Gimme Shelter', 'Brown Sugar', 'Angie'],
  'pink floyd': ['Another Brick in the Wall', 'Comfortably Numb', 'Wish You Were Here', 'Money', 'Time', 'Shine On You Crazy Diamond'],

  // === ELECTRONIC / EDM ===
  'deadmau5': ['Ghosts \'n\' Stuff', 'Strobe', 'I Remember', 'The Veldt', 'Professional Griefers', 'Raise Your Weapon'],
  'daft punk': ['Get Lucky', 'One More Time', 'Harder Better Faster Stronger', 'Around the World', 'Digital Love', 'Instant Crush'],
  'calvin harris': ['Feel So Close', 'We Found Love', 'Summer', 'This Is What You Came For', 'One Kiss', 'Feels'],
  'avicii': ['Wake Me Up', 'Levels', 'Hey Brother', 'The Nights', 'Waiting for Love', 'Without You'],
  'skrillex': ['Bangarang', 'Scary Monsters and Nice Sprites', 'First of the Year', 'Cinema', 'Where Are Ü Now', 'Purple Lamborghini'],

  // === COUNTRY MUSIC ===
  'johnny cash': ['Ring of Fire', 'I Walk the Line', 'Folsom Prison Blues', 'Hurt', 'Man in Black', 'A Boy Named Sue'],
  'willie nelson': ['On the Road Again', 'Blue Eyes Crying in the Rain', 'Mammas Don\'t Let Your Babies Grow Up to Be Cowboys', 'Always on My Mind', 'Whiskey River', 'Georgia on My Mind'],

  // === R&B / SOUL ===
  'the weeknd': ['Blinding Lights', 'Can\'t Feel My Face', 'The Hills', 'Starboy', 'Earned It', 'I Feel It Coming'],
  'bruno mars': ['Uptown Funk', '24K Magic', 'Just the Way You Are', 'Grenade', 'Count on Me', 'Locked Out of Heaven'],

  // === METAL ===
  'metallica': ['Enter Sandman', 'Master of Puppets', 'One', 'Nothing Else Matters', 'Fade to Black', 'For Whom the Bell Tolls'],
  'iron maiden': ['The Number of the Beast', 'Run to the Hills', 'Fear of the Dark', 'Aces High', 'Wasted Years', 'Hallowed Be Thy Name'],

  // === ALTERNATIVE / INDIE ===
  'radiohead': ['Creep', 'Karma Police', 'Paranoid Android', 'No Surprises', 'High and Dry', 'Fake Plastic Trees'],
  'coldplay': ['Yellow', 'Fix You', 'Viva la Vida', 'The Scientist', 'Clocks', 'Paradise'],

  // === ADDITIONAL POPULAR ARTISTS ===
  'imagine dragons': ['Radioactive', 'Demons', 'Thunder', 'Believer', 'Whatever It Takes', 'Natural'],
  'foo fighters': ['Everlong', 'Learn to Fly', 'The Pretender', 'My Hero', 'Times Like These', 'Best of You'],
  'green day': ['Basket Case', 'When I Come Around', 'Longview', 'American Idiot', 'Boulevard of Broken Dreams', 'Good Riddance'],
  'nirvana': ['Smells Like Teen Spirit', 'Come As You Are', 'Lithium', 'In Bloom', 'Heart-Shaped Box', 'About a Girl'],
  'pearl jam': ['Alive', 'Even Flow', 'Jeremy', 'Black', 'Better Man', 'Elderly Woman Behind the Counter'],
  'red hot chili peppers': ['Under the Bridge', 'Give It Away', 'Californication', 'Scar Tissue', 'By the Way', 'Dani California'],
  'blink-182': ['All the Small Things', 'What\'s My Age Again?', 'Dammit', 'I Miss You', 'Adam\'s Song', 'The Rock Show'],
  'the offspring': ['Come Out and Play', 'Self Esteem', 'Gotta Get Away', 'Pretty Fly (For a White Guy)', 'The Kids Aren\'t Alright', 'Hit That']
};

export class BackupMusicDiscoveryService {
  /**
   * Get similar artists from curated database
   */
  getSimilarArtists(artist: string, maxCount: number = 15): SimilarArtist[] {
    const normalizedArtist = artist.toLowerCase().trim();
    const similarArtists = SIMILAR_ARTISTS_DB[normalizedArtist] || [];
    
    console.log(`🎯 Backup discovery for "${artist}": found ${similarArtists.length} curated similar artists`);
    
    return similarArtists.slice(0, maxCount);
  }

  /**
   * Get popular songs for an artist
   */
  getPopularSongs(artist: string): string[] {
    const normalizedArtist = artist.toLowerCase().trim();
    return POPULAR_SONGS_DB[normalizedArtist] || [];
  }

  /**
   * Check if we have data for an artist
   */
  hasDataFor(artist: string): boolean {
    const normalizedArtist = artist.toLowerCase().trim();
    return normalizedArtist in SIMILAR_ARTISTS_DB;
  }

  /**
   * Get all supported artists
   */
  getSupportedArtists(): string[] {
    return Object.keys(SIMILAR_ARTISTS_DB);
  }

  /**
   * Generate search queries for similar artists with their popular songs
   */
  generateSimilarArtistSearches(artist: string, maxArtists: number = 10): Array<{query: string, artist: string, priority: number}> {
    const similarArtists = this.getSimilarArtists(artist, maxArtists);
    const searches: Array<{query: string, artist: string, priority: number}> = [];

    similarArtists.forEach((similarArtist, index) => {
      const priority = Math.floor(similarArtist.similarity * 10);
      const popularSongs = this.getPopularSongs(similarArtist.name);

      // Add basic artist search
      searches.push({
        query: similarArtist.name,
        artist: similarArtist.name,
        priority: priority
      });

      // Add searches with popular songs
      if (popularSongs.length > 0) {
        const topSongs = popularSongs.slice(0, 2); // Top 2 songs
        topSongs.forEach(song => {
          searches.push({
            query: `${similarArtist.name} ${song}`,
            artist: similarArtist.name,
            priority: priority - 1
          });
        });
      }
    });

    console.log(`🎵 Generated ${searches.length} backup searches for ${artist}`);
    return searches.sort((a, b) => b.priority - a.priority);
  }
}

// Export singleton instance
export const backupMusicDiscovery = new BackupMusicDiscoveryService();
