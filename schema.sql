-- CineMania Database Schema
CREATE DATABASE IF NOT EXISTS cinemania;
USE cinemania;

-- Users Table
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(150) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  avatar VARCHAR(255) DEFAULT 'default.png',
  role ENUM('user', 'admin') DEFAULT 'user',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Subscription Plans Table
CREATE TABLE IF NOT EXISTS plans (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(50) NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  duration_days INT NOT NULL,
  max_screens INT NOT NULL,
  video_quality ENUM('SD', 'HD', 'FHD', '4K') NOT NULL,
  downloads BOOLEAN DEFAULT FALSE,
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Subscriptions Table
CREATE TABLE IF NOT EXISTS subscriptions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  plan_id INT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status ENUM('active', 'expired', 'cancelled') DEFAULT 'active',
  payment_method VARCHAR(50) DEFAULT 'card',
  amount_paid DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (plan_id) REFERENCES plans(id)
);

-- Content Table (Movies/Shows)
CREATE TABLE IF NOT EXISTS content (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(200) NOT NULL,
  description TEXT,
  type ENUM('movie', 'series', 'documentary') NOT NULL,
  genre VARCHAR(100),
  language VARCHAR(50) DEFAULT 'English',
  release_year INT,
  duration_mins INT,
  rating DECIMAL(3,1) DEFAULT 0,
  thumbnail VARCHAR(255),
  video_url VARCHAR(255),
  trailer_url VARCHAR(255),
  required_plan ENUM('basic', 'standard', 'premium') DEFAULT 'basic',
  is_featured BOOLEAN DEFAULT FALSE,
  is_trending BOOLEAN DEFAULT FALSE,
  is_new BOOLEAN DEFAULT FALSE,
  views INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Watchlist Table
CREATE TABLE IF NOT EXISTS watchlist (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  content_id INT NOT NULL,
  added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY unique_watchlist (user_id, content_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (content_id) REFERENCES content(id) ON DELETE CASCADE
);

-- Watch History Table
CREATE TABLE IF NOT EXISTS watch_history (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  content_id INT NOT NULL,
  watched_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  progress_percent INT DEFAULT 0,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (content_id) REFERENCES content(id) ON DELETE CASCADE
);

-- ===================== SEED DATA =====================

-- Insert Plans
INSERT INTO plans (name, price, duration_days, max_screens, video_quality, downloads, description) VALUES
('Basic', 149.00, 30, 1, 'SD', FALSE, 'Watch on 1 screen. SD quality. No downloads.'),
('Standard', 499.00, 30, 2, 'HD', FALSE, 'Watch on 2 screens simultaneously. HD quality.'),
('Premium', 649.00, 30, 4, '4K', TRUE, 'Watch on 4 screens. 4K Ultra HD. Unlimited downloads.');

-- Insert Sample Content
INSERT INTO content (title, description, type, genre, language, release_year, duration_mins, rating, required_plan, is_featured, is_trending, is_new) VALUES
('The Dark Knight', 'Batman faces the Joker in Gotham City.', 'movie', 'Action, Crime', 'English', 2008, 152, 9.0, 'basic', TRUE, FALSE, FALSE),
('Inception', 'A thief who steals corporate secrets through dreams.', 'movie', 'Sci-Fi, Thriller', 'English', 2010, 148, 8.8, 'basic', FALSE, TRUE, FALSE),
('Stranger Things', 'A group of kids encounter supernatural forces.', 'series', 'Sci-Fi, Horror', 'English', 2016, 50, 8.7, 'standard', TRUE, TRUE, FALSE),
('Oppenheimer', 'Story of the inventor of the atomic bomb.', 'movie', 'Drama, History', 'English', 2023, 180, 8.9, 'basic', FALSE, TRUE, TRUE),
('Dune: Part Two', 'Paul Atreides unites with the Fremen.', 'movie', 'Sci-Fi, Adventure', 'English', 2024, 166, 8.8, 'standard', TRUE, TRUE, TRUE),
('The Crown', 'The political rivalries of the British royal family.', 'series', 'Drama, History', 'English', 2016, 55, 8.7, 'standard', FALSE, FALSE, FALSE),
('RRR', 'Two Indian revolutionaries and their heroic deeds.', 'movie', 'Action, Drama', 'Telugu', 2022, 187, 8.0, 'basic', FALSE, TRUE, FALSE),
('Money Heist', 'A criminal mastermind plans the perfect heist.', 'series', 'Crime, Thriller', 'Spanish', 2017, 45, 8.2, 'standard', FALSE, FALSE, FALSE),
('Avengers: Endgame', 'The Avengers assemble to reverse Thanos actions.', 'movie', 'Action, Sci-Fi', 'English', 2019, 181, 8.4, 'basic', FALSE, FALSE, FALSE),
('Breaking Bad', 'A chemistry teacher turns to making methamphetamine.', 'series', 'Crime, Drama', 'English', 2008, 47, 9.5, 'premium', FALSE, FALSE, FALSE),
('Kalki 2898 AD', 'A futuristic mythological action movie.', 'movie', 'Action, Sci-Fi', 'Telugu', 2024, 180, 7.5, 'basic', TRUE, TRUE, TRUE),
('The Boys', 'Superheroes are corrupted by fame and power.', 'series', 'Action, Comedy', 'English', 2019, 60, 8.7, 'premium', FALSE, TRUE, FALSE);

-- Insert Admin User (password: admin123)
INSERT INTO users (name, email, password, role) VALUES
('Admin', 'admin@cinemania.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2uheWG/igi.', 'admin');
