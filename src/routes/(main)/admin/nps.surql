(<float> (SELECT count() FROM hourSubmission WHERE howLikelyRecommend >= 9 GROUP ALL)[0].count
- <float> (SELECT count() FROM hourSubmission WHERE howLikelyRecommend <= 6 GROUP ALL)[0].count)
/ <float> (SELECT count() FROM hourSubmission GROUP ALL)[0].count
