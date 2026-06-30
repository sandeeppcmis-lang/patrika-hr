// Simple keyword-match grader: compares candidate resume against position JD
// Returns { grade: 'A'|'B'|'C'|'D', score: 0-100, matchedKeywords: [] }

const STOPWORDS = new Set([
  'a','an','the','and','or','but','in','on','at','to','for','of','with','by',
  'from','is','are','was','were','be','been','being','have','has','had','do',
  'does','did','will','would','could','should','may','might','shall','can',
  'this','that','these','those','it','its','we','our','you','your','they',
  'their','as','if','so','not','no','all','also','any','each','more','than',
  'into','about','through','during','before','after','above','below','between',
  'i','me','my','he','she','his','her','him','us','them','what','which','who',
  'how','when','where','why','while','within','without','across','along',
  'both','either','other','same','such','up','out','off','over','under','again'
]);

function tokenize(text) {
  if (!text) return new Set();
  return new Set(
    text.toLowerCase()
      .replace(/<[^>]+>/g, ' ')       // strip HTML
      .replace(/[^a-z0-9\s]/g, ' ')   // strip punctuation
      .split(/\s+/)
      .filter(w => w.length > 2 && !STOPWORDS.has(w))
  );
}

function scoreText(resumeText, jdText) {
  const jdWords  = tokenize(jdText);
  const resWords = tokenize(resumeText);
  if (jdWords.size === 0) return { score: 0, matched: [] };
  const matched = [...jdWords].filter(w => resWords.has(w));
  const score = Math.min(100, Math.round((matched.length / jdWords.size) * 200));
  return { score, matched };
}

function gradeFromScore(score) {
  if (score >= 70) return 'A';
  if (score >= 45) return 'B';
  if (score >= 20) return 'C';
  return 'D';
}

exports.computeGrade = function(candidate, jdHtml) {
  // Build resume text from all parsed fields
  const resumeParts = [
    candidate.parsedRawText   || '',
    candidate.parsedSummary   || '',
    candidate.parsedSkills    || '',
    candidate.parsedCurrentRole || '',
    candidate.parsedTotalExperience || ''
  ];
  const resumeText = resumeParts.join(' ');

  if (!jdHtml || !resumeText.trim()) {
    return { grade: 'D', score: 0, matchedKeywords: [] };
  }

  const { score, matched } = scoreText(resumeText, jdHtml);
  return { grade: gradeFromScore(score), score, matchedKeywords: matched.slice(0, 20) };
};
