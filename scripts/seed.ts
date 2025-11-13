/**
 * @file seed.ts
 * @description Simple data seeding utility to populate the database with baseline entities.
 */
import 'dotenv/config';
import { connectToDatabase, disconnectFromDatabase } from '../src/config/database';
import { MovieModel } from '../src/models/Movie';
import { TVShowModel } from '../src/models/TVShow';
import { UserModel } from '../src/models/User';
import { MyListItemModel } from '../src/models/MyListItem';
import { logger } from '../src/utils/logger';

const run = async (): Promise<void> => {
  await connectToDatabase();
  logger.info({ msg: 'Connected to MongoDB, preparing to seed data' });

  await Promise.all([MovieModel.deleteMany({}), TVShowModel.deleteMany({}), UserModel.deleteMany({})]);
  await MyListItemModel.deleteMany({});

  const [user] = await UserModel.create([
    {
      id: 'user-001',
      username: 'demo-user',
      preferences: {
        favoriteGenres: ['Action', 'SciFi'],
        dislikedGenres: ['Horror']
      },
      watchHistory: []
    }
  ]);

  const [movie, secondMovie] = await MovieModel.create([
    {
      id: 'movie-101',
      title: 'The Dawn of Code',
      description: 'A thrilling journey through software craftsmanship.',
      genres: ['Action', 'Drama'],
      releaseDate: new Date('2022-01-01'),
      director: 'Avery Jenkins',
      actors: ['Casey Lee', 'Robin Smith']
    },
    {
      id: 'movie-102',
      title: 'Refactor Reloaded',
      description: 'Engineers refactor code to save the world from bugs.',
      genres: ['SciFi', 'Action'],
      releaseDate: new Date('2023-05-10'),
      director: 'Morgan Wu',
      actors: ['Taylor Kim', 'Jordan Brooks']
    }
  ]);

  const [show] = await TVShowModel.create([
    {
      id: 'show-201',
      title: 'Galaxy Builders',
      description: 'Explorers build civilizations planet by planet.',
      genres: ['SciFi', 'Fantasy'],
      episodes: [
        {
          episodeNumber: 1,
          seasonNumber: 1,
          releaseDate: new Date('2021-09-22'),
          director: 'Reese Patel',
          actors: ['Skylar Nguyen']
        }
      ]
    }
  ]);

  await MyListItemModel.create([
    {
      userId: user.id,
      contentId: movie.id,
      contentType: 'Movie',
      title: movie.title,
      genres: movie.genres,
      addedAt: new Date()
    },
    {
      userId: user.id,
      contentId: show.id,
      contentType: 'TVShow',
      title: show.title,
      genres: show.genres,
      addedAt: new Date()
    }
  ]);

  logger.info({ msg: 'Database seeding completed successfully' });
  await disconnectFromDatabase();
};

run()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    logger.error({ msg: 'Seeding script failed', error });
    process.exit(1);
  });

