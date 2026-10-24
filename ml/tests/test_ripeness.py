import collections
import json
from pathlib import Path
import unittest
from agrotrace.ripeness import fruit_group
from agrotrace.ripeness_predict import summarize


class RipenessTests(unittest.TestCase):
    def test_same_identifier_stays_together_across_days_and_views(self):
        self.assertEqual(fruit_group('T10_d01_067_b_1_jpg.rf.x.jpg'), fruit_group('Tam_d21_067_a_5_jpg.rf.y.jpg'))
        with self.assertRaises(ValueError):
            fruit_group('no-identifier.jpg')

    def test_uncertain_estimate_has_no_label(self):
        value = summarize({'Ripe': .4, 'Overripe': .35, 'Underripe': .25}, 'test', .6)
        self.assertIsNone(value['label'])
        self.assertEqual(value['status'], 'uncertain')
        self.assertFalse(value['externalValidation'])

    def test_estimate_keeps_model_and_scores(self):
        value = summarize({'Ripe': .8, 'Overripe': .1, 'Underripe': .1}, 'test', .6)
        self.assertEqual(value['label'], 'Ripe')
        self.assertEqual(value['modelVersion'], 'test')
        self.assertEqual(value['score'], .8)
        self.assertEqual(value['thresholdStatus'], 'provisional_not_calibrated')

    def test_prepared_groups_and_hashes_do_not_cross_partitions(self):
        path = Path('datasets/palta/madurez/preparado-v1/audit.json')
        if not path.exists():
            self.skipTest('Dataset local no preparado')
        audit = json.loads(path.read_text())
        groups = collections.defaultdict(set)
        hashes = collections.defaultdict(set)
        for file in audit['files']:
            groups[file['group']].add(file['split'])
            hashes[file['sha256']].add(file['split'])
        self.assertTrue(all(len(s) == 1 for s in groups.values()))
        self.assertTrue(all(len(s) == 1 for s in hashes.values()))
        self.assertEqual(sum(s['images'] for s in audit['splits'].values()), 999)
