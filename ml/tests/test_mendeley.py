import collections
import json
from pathlib import Path
import unittest
import tempfile
import hashlib
from agrotrace.select_model import select
from agrotrace.mendeley import read_metadata
from agrotrace.ripeness import classification_report
from agrotrace.ripeness_predict import summarize


class MendeleyTests(unittest.TestCase):
    def test_five_stage_estimate_and_abstention(self):
        scores = {'01_Underripe': .05, '02_Breaking': .05, '03_Ripe_I': .8, '04_Ripe_II': .05, '05_Overripe': .05}
        value = summarize(scores, 'test', .6, 'hass_ripening_5', 'doi')
        self.assertEqual(value['stage'], 3)
        self.assertEqual(value['labelSchema'], 'hass_ripening_5')
        value = summarize(scores, 'test', .9, 'hass_ripening_5')
        self.assertIsNone(value['stage'])
        self.assertIsNone(value['label'])

    def test_ordinal_errors_are_separate_from_classification(self):
        matrix = [[0]*5 for _ in range(5)]
        matrix[0][0] = 2; matrix[1][0] = 1; matrix[4][2] = 1
        report = classification_report(matrix)
        self.assertEqual(report['images'], 4)
        self.assertEqual(report['meanAbsoluteStageError'], .75)
        self.assertEqual(report['withinOneStage'], .75)
        self.assertEqual(report['collapsedThreeStageAccuracy'], .75)
        with_background = [row+[0] for row in matrix] + [[0]*6]
        self.assertEqual(classification_report(with_background, 5), report)

    def test_selection_uses_validation_and_preserves_model_identity(self):
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary); candidates=[]
            for version, score in [('first', .7), ('second', .8)]:
                folder = root/version; folder.mkdir(); candidates.append(folder)
                weights=version.encode(); (folder/'best.pt').write_bytes(weights)
                manifest={'modelVersion': version, 'weightsSha256': hashlib.sha256(weights).hexdigest(),
                          'validation': {'metrics/accuracy_top1': score}, 'datasetManifestSha256': 'same',
                          'classes': ['a','b'], 'task': 'classify', 'preprocessing': 'rgb'}
                (folder/'model.json').write_text(json.dumps(manifest))
            chosen = select(candidates, root/'active')
            self.assertEqual(chosen['selectedVersion'], 'second')
            self.assertFalse(chosen['testUsedForSelection'])
            self.assertEqual((root/'active/best.pt').read_bytes(), b'second')

    def test_original_metadata_and_holdout_integrity(self):
        path = Path('datasets/palta/hass-mendeley/preparado-v1/audit.json')
        if not path.exists():
            self.skipTest('Conjunto Mendeley local no preparado')
        audit = json.loads(path.read_text())
        self.assertEqual(audit['preprocessing'], 'exif_transpose_rgb_resize_square')
        self.assertEqual(audit['source'], '10.17632/3xd9n945v8.1')
        self.assertEqual(audit['availableImages'], 14710)
        self.assertEqual(audit['metadataRows'], 14722)
        self.assertEqual(len(audit['missingImages']), 12)
        samples = collections.defaultdict(set)
        for file in audit['files']:
            samples[file['sample']].add(file['split'])
        self.assertEqual(len(samples), 478)
        self.assertTrue(all(len(v) == 1 for v in samples.values()))
        self.assertEqual(audit['roboflowOverlap']['matchedNames'], 999)
