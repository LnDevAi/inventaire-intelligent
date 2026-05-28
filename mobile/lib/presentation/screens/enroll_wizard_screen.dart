import 'dart:io';
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:geolocator/geolocator.dart';
import 'package:go_router/go_router.dart';
import 'package:connectivity_plus/connectivity_plus.dart';
import '../../core/services/api_service.dart';
import '../../core/services/isar_service.dart';
import '../../core/theme/app_theme.dart';
import '../../data/models/pending_scan_model.dart';

class EnrollWizardScreen extends StatefulWidget {
  final String? initialHardwareId;
  final String initialTagType;
  const EnrollWizardScreen({super.key, this.initialHardwareId, this.initialTagType = 'QR'});

  @override
  State<EnrollWizardScreen> createState() => _EnrollWizardScreenState();
}

class _EnrollWizardScreenState extends State<EnrollWizardScreen> {
  final _pageCtrl = PageController();
  int _step = 0;

  // Étape 1
  late final _hardwareIdCtrl = TextEditingController(text: widget.initialHardwareId);
  String _tagType = 'QR';

  // Étape 2
  final _nameCtrl = TextEditingController();
  final _categoryCtrl = TextEditingController();
  final _priceCtrl = TextEditingController();
  final _deprCtrl = TextEditingController(text: '5');
  File? _photo;

  // Étape 3
  Position? _position;
  bool _submitting = false;

  @override
  void initState() {
    super.initState();
    _tagType = widget.initialTagType;
  }

  void _next() {
    if (_step < 2) {
      _pageCtrl.nextPage(duration: const Duration(milliseconds: 300), curve: Curves.easeInOut);
      setState(() => _step++);
    } else {
      _submit();
    }
  }

  Future<void> _pickPhoto() async {
    final img = await ImagePicker().pickImage(source: ImageSource.camera, imageQuality: 70);
    if (img != null && mounted) setState(() => _photo = File(img.path));
  }

  Future<void> _getGps() async {
    try {
      final perm = await Geolocator.requestPermission();
      if (perm == LocationPermission.denied || perm == LocationPermission.deniedForever) return;
      final pos = await Geolocator.getCurrentPosition(desiredAccuracy: LocationAccuracy.high);
      if (mounted) setState(() => _position = pos);
    } catch (_) {}
  }

  Future<void> _submit() async {
    setState(() => _submitting = true);
    final price = double.tryParse(_priceCtrl.text.replaceAll(' ', '')) ?? 0;
    final depr = int.tryParse(_deprCtrl.text) ?? 5;
    final purchaseDate = DateTime.now().toIso8601String().substring(0, 10);

    try {
      final results = await Connectivity().checkConnectivity();
      final isOnline = results.any((r) => r != ConnectivityResult.none);

      if (isOnline) {
        final asset = await ApiService.instance.createAsset({
          'name': _nameCtrl.text.trim(),
          'category': _categoryCtrl.text.trim(),
          'purchasePrice': price,
          'purchaseDate': purchaseDate,
          'depreciationYears': depr,
        });
        await ApiService.instance.createTag({
          'assetId': asset['id'],
          'tagType': _tagType,
          'hardwareId': _hardwareIdCtrl.text.trim(),
        });
        if (_position != null) {
          await ApiService.instance.createLocation(
            asset['id'] as String, _position!.latitude, _position!.longitude,
          );
        }
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Bien enrôlé avec succès ✓'), backgroundColor: AppTheme.success),
          );
          context.go('/assets/${asset['id']}');
        }
      } else {
        // Offline — save to Isar
        final pending = PendingScanModel()
          ..hardwareId = _hardwareIdCtrl.text.trim()
          ..tagType = _tagType
          ..assetName = _nameCtrl.text.trim()
          ..category = _categoryCtrl.text.trim()
          ..purchasePrice = price
          ..purchaseDate = purchaseDate
          ..depreciationYears = depr
          ..photoPath = _photo?.path
          ..latitude = _position?.latitude
          ..longitude = _position?.longitude
          ..synced = false
          ..createdAt = DateTime.now();

        await IsarService.instance.db.writeTxn(() async {
          await IsarService.instance.db.pendingScanModels.put(pending);
        });
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Scan sauvegardé hors ligne — sera synchronisé à la reconnexion'),
                backgroundColor: AppTheme.warning),
          );
          context.go('/dashboard');
        }
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Erreur : $e'), backgroundColor: AppTheme.danger),
        );
      }
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text('Enrôlement — Étape ${_step + 1}/3'),
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(4),
          child: LinearProgressIndicator(
            value: (_step + 1) / 3,
            backgroundColor: AppTheme.border,
            color: AppTheme.primary,
          ),
        ),
      ),
      body: PageView(
        controller: _pageCtrl,
        physics: const NeverScrollableScrollPhysics(),
        children: [_stepTag(), _stepAsset(), _stepConfirm()],
      ),
    );
  }

  Widget _stepTag() => _StepWrapper(
    title: 'Tag à enrôler',
    onNext: () {
      if (_hardwareIdCtrl.text.trim().isEmpty) {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Identifiant requis')));
        return;
      }
      _next();
    },
    child: Column(children: [
      TextFormField(
        controller: _hardwareIdCtrl,
        decoration: const InputDecoration(labelText: 'Identifiant du tag', prefixIcon: Icon(Icons.label_outline)),
      ),
      const SizedBox(height: 16),
      const Text('Type de tag', style: TextStyle(color: Color(0xFF94A3B8), fontSize: 13)),
      const SizedBox(height: 8),
      Wrap(spacing: 8, children: ['QR', 'RFID', 'BLE', 'GPS'].map((t) => ChoiceChip(
        label: Text(t),
        selected: _tagType == t,
        onSelected: (_) => setState(() => _tagType = t),
        selectedColor: AppTheme.primary.withOpacity(0.2),
      )).toList()),
    ]),
  );

  Widget _stepAsset() => _StepWrapper(
    title: 'Informations du bien',
    onNext: () {
      if (_nameCtrl.text.trim().isEmpty || _categoryCtrl.text.trim().isEmpty) {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Nom et catégorie requis')));
        return;
      }
      _next();
    },
    child: Column(children: [
      // Photo
      GestureDetector(
        onTap: _pickPhoto,
        child: Container(
          height: 120, width: double.infinity,
          decoration: BoxDecoration(
            color: AppTheme.surface, borderRadius: BorderRadius.circular(12),
            border: Border.all(color: AppTheme.border),
            image: _photo != null ? DecorationImage(image: FileImage(_photo!), fit: BoxFit.cover) : null,
          ),
          child: _photo == null
              ? const Column(mainAxisAlignment: MainAxisAlignment.center, children: [
                  Icon(Icons.camera_alt_outlined, color: Color(0xFF64748B), size: 32),
                  SizedBox(height: 4),
                  Text('Photo du bien', style: TextStyle(color: Color(0xFF64748B), fontSize: 12)),
                ])
              : null,
        ),
      ),
      const SizedBox(height: 16),
      TextField(controller: _nameCtrl,
          decoration: const InputDecoration(labelText: 'Nom du bien', prefixIcon: Icon(Icons.inventory_2_outlined))),
      const SizedBox(height: 12),
      TextField(controller: _categoryCtrl,
          decoration: const InputDecoration(labelText: 'Catégorie', prefixIcon: Icon(Icons.category_outlined))),
      const SizedBox(height: 12),
      Row(children: [
        Expanded(child: TextField(controller: _priceCtrl, keyboardType: TextInputType.number,
            decoration: const InputDecoration(labelText: 'Prix d\'achat (FCFA)', isDense: true))),
        const SizedBox(width: 12),
        Expanded(child: TextField(controller: _deprCtrl, keyboardType: TextInputType.number,
            decoration: const InputDecoration(labelText: 'Durée (ans)', isDense: true))),
      ]),
    ]),
  );

  Widget _stepConfirm() => _StepWrapper(
    title: 'Confirmation',
    nextLabel: _submitting ? 'Enregistrement…' : 'Enrôler',
    onNext: _submitting ? null : _next,
    child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      _ConfirmRow('Tag', '${_hardwareIdCtrl.text} (${_tagType})'),
      _ConfirmRow('Bien', _nameCtrl.text),
      _ConfirmRow('Catégorie', _categoryCtrl.text),
      _ConfirmRow('Prix', '${_priceCtrl.text} FCFA'),
      _ConfirmRow('Amortissement', '${_deprCtrl.text} ans'),
      const SizedBox(height: 20),
      SizedBox(
        width: double.infinity,
        child: OutlinedButton.icon(
          icon: Icon(_position == null ? Icons.gps_not_fixed : Icons.gps_fixed,
              color: _position == null ? null : AppTheme.success),
          label: Text(_position == null ? 'Capturer la position GPS' : 'GPS capturé ✓'),
          style: OutlinedButton.styleFrom(
            minimumSize: const Size.fromHeight(48),
            foregroundColor: _position == null ? null : AppTheme.success,
            side: BorderSide(color: _position == null ? AppTheme.border : AppTheme.success),
          ),
          onPressed: _getGps,
        ),
      ),
    ]),
  );

  @override
  void dispose() {
    _pageCtrl.dispose();
    _hardwareIdCtrl.dispose();
    _nameCtrl.dispose();
    _categoryCtrl.dispose();
    _priceCtrl.dispose();
    _deprCtrl.dispose();
    super.dispose();
  }
}

class _StepWrapper extends StatelessWidget {
  final String title;
  final Widget child;
  final VoidCallback? onNext;
  final String nextLabel;
  const _StepWrapper({required this.title, required this.child, this.onNext, this.nextLabel = 'Suivant'});

  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.all(20),
    child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Text(title, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
      const SizedBox(height: 20),
      Expanded(child: SingleChildScrollView(child: child)),
      ElevatedButton(onPressed: onNext, child: Text(nextLabel)),
    ]),
  );
}

class _ConfirmRow extends StatelessWidget {
  final String label;
  final String value;
  const _ConfirmRow(this.label, this.value);

  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.symmetric(vertical: 6),
    child: Row(children: [
      Text('$label :', style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 14)),
      const SizedBox(width: 8),
      Expanded(child: Text(value, style: const TextStyle(fontWeight: FontWeight.w600),
          overflow: TextOverflow.ellipsis)),
    ]),
  );
}
