"""Tests for core.quality module."""

from core.quality import is_quality_acceptable, needs_fallback, score_text


class TestScoreText:
    def test_empty_text(self):
        result = score_text("", min_word_count=10)
        assert result["overall"] == 0.0
        assert all(v == 0.0 for v in result["signals"].values())

    def test_whitespace_only(self):
        result = score_text("   \n  \t  ", min_word_count=10)
        assert result["overall"] == 0.0

    def test_good_text(self):
        text = "The quick brown fox jumps over the lazy dog. " * 10
        result = score_text(text, min_word_count=10)
        assert result["overall"] >= 0.8
        assert result["signals"]["garbage_ratio"] >= 0.9

    def test_garbage_text(self):
        text = "\x80\x81\x82\x83\x84\x85\x86\x87\x88\x89\x8a\x8b\x8c\x8d\x8e\x8f"
        result = score_text(text, min_word_count=10)
        assert result["overall"] < 0.5

    def test_repeated_punctuation(self):
        text = "hello!!!! world???? foo:::: bar;;;; baz::::"
        result = score_text(text, min_word_count=10)
        assert result["signals"]["repetition"] < 1.0

    def test_bad_phrases(self):
        text = "lorem ipsum dolor sit amet xxxxx undefined"
        result = score_text(text, min_word_count=10)
        assert result["signals"]["bad_phrases"] < 1.0

    def test_very_short_words(self):
        text = "a b c d e f g h i j k l m n o p"
        result = score_text(text, min_word_count=10)
        assert result["signals"]["avg_word_length"] < 0.8  # avg len ~1 is bad

    def test_signal_keys_present(self):
        text = "Normal text with enough words for quality scoring."
        result = score_text(text, min_word_count=5)
        expected_keys = {"word_count", "garbage_ratio", "repetition", "avg_word_length", "bad_phrases"}
        assert set(result["signals"].keys()) == expected_keys

    def test_overall_is_weighted_average(self):
        text = "A decent block of text for testing purposes. " * 5
        result = score_text(text, min_word_count=5)
        assert 0.0 <= result["overall"] <= 1.0


class TestIsQualityAcceptable:
    def test_above_threshold(self):
        assert is_quality_acceptable(0.8, 0.6) is True

    def test_below_threshold(self):
        assert is_quality_acceptable(0.4, 0.6) is False

    def test_at_threshold(self):
        assert is_quality_acceptable(0.6, 0.6) is True

    def test_default_threshold(self):
        assert is_quality_acceptable(0.7) is True
        assert is_quality_acceptable(0.5) is False


class TestNeedsFallback:
    def test_poor_quality(self):
        # Short text with garbage chars → should be below threshold
        assert needs_fallback("\x80\x80\x80\x80\x80", threshold=0.6, min_word_count=10) is True

    def test_good_quality_no_fallback(self):
        assert needs_fallback("Quality text. " * 20, threshold=0.6, min_word_count=10) is False
