// src/lib/recommendation.js

/**
 * Computes the cosine similarity between two numerical vectors.
 * Formula: (A . B) / (||A|| * ||B||)
 */
export function cosineSimilarity(vecA, vecB) {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  // Find all unique keys across both sparse vectors
  const allKeys = new Set([...Object.keys(vecA), ...Object.keys(vecB)]);

  allKeys.forEach(key => {
    const valA = vecA[key] || 0;
    const valB = vecB[key] || 0;
    dotProduct += valA * valB;
    normA += valA * valA;
    normB += valB * valB;
  });

  if (normA === 0 || normB === 0) {
    return 0;
  }

  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Builds a vector representation of a student's profile based on:
 * - Department (weight = 3)
 * - Expressed Interests (weight = 2)
 * - Past Attended Categories/Tags (weight = 1 per instance)
 */
export function buildStudentVector(student, pastEvents = []) {
  const vector = {};

  // 1. Department Tag
  if (student.department) {
    const deptTag = student.department.toLowerCase().trim();
    vector[deptTag] = (vector[deptTag] || 0) + 3;
  }

  // 2. Explicitly tagged interests
  if (Array.isArray(student.interests)) {
    student.interests.forEach(interest => {
      const tag = interest.toLowerCase().trim();
      vector[tag] = (vector[tag] || 0) + 2;
    });
  }

  // 3. Past attended events tags/categories
  if (Array.isArray(pastEvents)) {
    pastEvents.forEach(event => {
      if (event.category) {
        const cat = event.category.toLowerCase().trim();
        vector[cat] = (vector[cat] || 0) + 1;
      }
      if (Array.isArray(event.tags)) {
        event.tags.forEach(tag => {
          const formattedTag = tag.toLowerCase().trim();
          vector[formattedTag] = (vector[formattedTag] || 0) + 1;
        });
      }
    });
  }

  return vector;
}

/**
 * Builds a vector representation of an event based on:
 * - Department relevance (weight = 3)
 * - Category (weight = 2)
 * - Individual Tags (weight = 2)
 */
export function buildEventVector(event) {
  const vector = {};

  // 1. Department
  if (event.department) {
    const deptTag = event.department.toLowerCase().trim();
    vector[deptTag] = (vector[deptTag] || 0) + 3;
  }

  // 2. Category
  if (event.category) {
    const cat = event.category.toLowerCase().trim();
    vector[cat] = (vector[cat] || 0) + 2;
  }

  // 3. Tags
  if (Array.isArray(event.tags)) {
    event.tags.forEach(tag => {
      const formattedTag = tag.toLowerCase().trim();
      vector[formattedTag] = (vector[formattedTag] || 0) + 2;
    });
  }

  return vector;
}

/**
 * Recommends top N events for a student.
 * Returns an array of events, each with a `matchPercentage` parameter.
 */
export function getRecommendations(student, upcomingEvents, pastEvents = [], topN = 3) {
  const studentVector = buildStudentVector(student, pastEvents);

  const recommendations = upcomingEvents.map(event => {
    const eventVector = buildEventVector(event);
    const similarity = cosineSimilarity(studentVector, eventVector);
    const matchPercentage = Math.round(similarity * 100);

    return {
      ...event,
      matchPercentage,
    };
  });

  // Sort by match percentage descending, filter out 0% matches if there are other matches
  return recommendations
    .sort((a, b) => b.matchPercentage - a.matchPercentage)
    .slice(0, topN);
}

/**
 * Generates an AI-crafted professional description for campus events based on metadata.
 */
export async function generateAIDescription({ title = '', category = 'Technical', venue = '', department = '', audience = '', tags = '' }) {
  await new Promise(resolve => setTimeout(resolve, 750));

  const cleanTitle = title.trim() || 'Campus Flagship Event';
  const cleanCategory = category.trim() || 'Technical & Innovation';
  const cleanVenue = venue.trim() || 'Campus Seminar Hall';
  const cleanDept = department.trim() || 'Computer Science & Engineering';
  const cleanAudience = audience.trim() || 'All Registered Students & Faculty Members';
  const cleanTags = tags ? tags.split(',').map(t => t.trim()).filter(Boolean).join(', ') : 'Innovation, Hands-on Learning, Skill Building';

  const templates = [
    `Join us for "${cleanTitle}", a premier ${cleanCategory.toLowerCase()} event organized by the Department of ${cleanDept}. Taking place at ${cleanVenue}, this event is open to ${cleanAudience.toLowerCase()}.\n\n` +
    `Key Highlights:\n` +
    `• Interactive sessions & live project demonstrations\n` +
    `• In-depth learning in ${cleanTags}\n` +
    `• Peer networking, Q&A session, and participation certificates\n\n` +
    `Don't miss this high-impact learning opportunity! Register now to secure your seat.`,

    `The Department of ${cleanDept} presents "${cleanTitle}" — an engaging ${cleanCategory.toLowerCase()} workshop designed to boost technical expertise and teamwork.\n\n` +
    `Event Details:\n` +
    `📍 Venue: ${cleanVenue}\n` +
    `🎯 Audience: ${cleanAudience}\n` +
    `🏷️ Focus Areas: ${cleanTags}\n\n` +
    `Participants will gain practical exposure, solve real-world problems, and receive guidance from faculty coordinators. Seats are limited. Reserve your spot today!`,

    `Empower your skills with "${cleanTitle}"! Hosted at ${cleanVenue}, this ${cleanCategory.toLowerCase()} event offers comprehensive insights and hands-on activities for ${cleanAudience.toLowerCase()}.\n\n` +
    `What to Expect:\n` +
    `1. Expert presentations on ${cleanTags}\n` +
    `2. Interactive Q&A and networking opportunities\n` +
    `3. Digital attendance pass & participation certificate\n\n` +
    `Take your skills to the next level. RSVP now!`
  ];

  const index = Math.abs(cleanTitle.length) % templates.length;
  return templates[index];
}
