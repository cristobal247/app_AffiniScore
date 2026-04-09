import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

// Punto de entrada de la app Flutter.
// Primero prepara Flutter, luego inicializa Supabase si hay credenciales y
// finalmente ejecuta el widget principal.
Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await SupabaseConfig.initialize();
  runApp(const AffiniScoreApp());
}

// Configuración mínima para Supabase.
// En esta versión las credenciales están vacías porque la app usa mock data,
// pero aquí quedará la conexión real cuando se agreguen URL y anon key.
class SupabaseConfig {
  static const String url = '';
  static const String anonKey = '';

  // Inicializa Supabase solo si las credenciales fueron configuradas.
  static Future<void> initialize() async {
    if (url.isEmpty || anonKey.isEmpty) {
      return;
    }

    await Supabase.initialize(url: url, anonKey: anonKey);
  }

  static bool get isConfigured => url.isNotEmpty && anonKey.isNotEmpty;
}

// Widget raíz de la aplicación.
// Define el tema visual general, la paleta sobria y la pantalla principal.
class AffiniScoreApp extends StatelessWidget {
  const AffiniScoreApp({super.key});

  @override
  Widget build(BuildContext context) {
    const Color background = Color(0xFFF4EFE8);
    const Color surface = Color(0xFFF9F6F1);
    const Color primary = Color(0xFF6A4B3C);
    const Color secondary = Color(0xFF8C7A68);
    const Color accent = Color(0xFF4E6E58);

    final ColorScheme colorScheme =
        ColorScheme.fromSeed(
          seedColor: primary,
          brightness: Brightness.light,
          surface: surface,
        ).copyWith(
          primary: primary,
          secondary: secondary,
          tertiary: accent,
          surface: surface,
          background: background,
          onSurface: const Color(0xFF2E2722),
        );

    return MaterialApp(
      debugShowCheckedModeBanner: false,
      title: 'AffiniScore v0.01',
      theme: ThemeData(
        useMaterial3: true,
        colorScheme: colorScheme,
        scaffoldBackgroundColor: background,
        appBarTheme: const AppBarTheme(
          centerTitle: false,
          elevation: 0,
          backgroundColor: Colors.transparent,
          foregroundColor: Color(0xFF2E2722),
        ),
        cardTheme: CardThemeData(
          color: surface,
          elevation: 0,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(24),
          ),
        ),
        bottomNavigationBarTheme: const BottomNavigationBarThemeData(
          type: BottomNavigationBarType.fixed,
        ),
      ),
      home: const AffiniShell(),
    );
  }
}

// Contenedor principal de la experiencia.
// Mantiene el estado de navegación, privacidad, puntos y retos completados.
class AffiniShell extends StatefulWidget {
  const AffiniShell({super.key});

  @override
  State<AffiniShell> createState() => _AffiniShellState();
}

class _AffiniShellState extends State<AffiniShell> {
  // Índice de la pestaña seleccionada en el BottomNavigationBar.
  int _currentIndex = 0;
  // Interruptor local para simular el GPS independiente del usuario.
  bool _privacyEnabled = true;
  // Token demo para el emparejamiento de la pareja.
  final String _pairingToken = 'AF-2841';

  // Puntos demo compartidos para visualizar la evolución de la relación.
  int _affinityPoints = 1280;
  // Puntos acumulados por el usuario.
  int _userPoints = 640;
  // Puntos acumulados por la pareja.
  int _partnerPoints = 640;

  // Lista simple de retos cortos que suman puntos al marcarse.
  final List<ChallengeItem> _challenges = [
    ChallengeItem(title: 'Llevar el desayuno', points: 40),
    ChallengeItem(title: 'Enviar un mensaje de gratitud', points: 20),
    ChallengeItem(title: 'Planear una cita corta', points: 60),
    ChallengeItem(title: 'Compartir una caminata de 15 minutos', points: 35),
  ];

  // Índice de afinidad calculado a partir de los puntos demo.
  double get _affinityIndex =>
      (math.min(100.0, 45 + (_affinityPoints / 35))).toDouble();

  // Marca o desmarca un reto y actualiza los puntos asociados.
  void _toggleChallenge(int index, bool value) {
    setState(() {
      final ChallengeItem challenge = _challenges[index];
      if (value && !challenge.completed) {
        _affinityPoints += challenge.points;
        _userPoints += challenge.points ~/ 2;
        _partnerPoints += challenge.points - (challenge.points ~/ 2);
      } else if (!value && challenge.completed) {
        _affinityPoints -= challenge.points;
        _userPoints -= challenge.points ~/ 2;
        _partnerPoints -= challenge.points - (challenge.points ~/ 2);
      }
      _challenges[index] = challenge.copyWith(completed: value);
    });
  }

  // Simula el botón de emergencia S.O.S.
  // Muestra una notificación y luego un diálogo indicando que se envió
  // ubicación y un audio corto de prueba.
  Future<void> _triggerSos() async {
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Text(
          'S.O.S enviado: compartiendo ubicación y audio de 5 segundos.',
        ),
      ),
    );

    await Future<void>.delayed(const Duration(seconds: 1));
    if (!mounted) {
      return;
    }

    showDialog<void>(
      context: context,
      builder: (BuildContext context) {
        return AlertDialog(
          title: const Text('S.O.S activado'),
          content: const Text(
            'Ubicación enviada y audio de 5 segundos simulado para la demo.',
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(context).pop(),
              child: const Text('Cerrar'),
            ),
          ],
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    // Las 4 pantallas principales de la app.
    final List<Widget> pages = [
      DashboardPage(
        affinityIndex: _affinityIndex,
        affinityPoints: _affinityPoints,
        userPoints: _userPoints,
        partnerPoints: _partnerPoints,
        pairingToken: _pairingToken,
        supabaseConfigured: SupabaseConfig.isConfigured,
      ),
      ChatPage(token: _pairingToken),
      MapPage(
        privacyEnabled: _privacyEnabled,
        onPrivacyChanged: (bool value) =>
            setState(() => _privacyEnabled = value),
      ),
      ChallengesPage(
        challenges: _challenges,
        onToggleChallenge: _toggleChallenge,
      ),
    ];

    // Scaffold base con AppBar, botón S.O.S, navegación inferior y el contenido.
    return Scaffold(
      appBar: AppBar(
        // Título visible en la parte superior.
        title: const Text('AffiniScore v0.01'),
        actions: [
          // Botón de acceso rápido al emparejamiento.
          IconButton(
            tooltip: 'Emparejamiento',
            onPressed: () {
              setState(() {
                _currentIndex = 0;
              });
              showModalBottomSheet<void>(
                context: context,
                showDragHandle: true,
                backgroundColor: Theme.of(context).colorScheme.surface,
                builder: (BuildContext context) {
                  return PairingSheet(token: _pairingToken);
                },
              );
            },
            icon: const Icon(Icons.qr_code_2_rounded),
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: _triggerSos,
        icon: const Icon(Icons.warning_rounded),
        label: const Text('S.O.S'),
      ),
      body: IndexedStack(index: _currentIndex, children: pages),
      bottomNavigationBar: BottomNavigationBar(
        currentIndex: _currentIndex,
        onTap: (int value) => setState(() => _currentIndex = value),
        type: BottomNavigationBarType.fixed,
        selectedItemColor: Theme.of(context).colorScheme.primary,
        unselectedItemColor: Theme.of(context).colorScheme.onSurfaceVariant,
        items: const [
          BottomNavigationBarItem(
            icon: Icon(Icons.insights_outlined),
            activeIcon: Icon(Icons.insights),
            label: 'Dashboard',
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.chat_bubble_outline),
            activeIcon: Icon(Icons.chat_bubble),
            label: 'Chat',
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.map_outlined),
            activeIcon: Icon(Icons.map),
            label: 'Mapa',
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.flag_outlined),
            activeIcon: Icon(Icons.flag),
            label: 'Desafíos',
          ),
        ],
      ),
    );
  }
}

// Pantalla principal de puntuación y resumen de la relación.
class DashboardPage extends StatelessWidget {
  const DashboardPage({
    super.key,
    required this.affinityIndex,
    required this.affinityPoints,
    required this.userPoints,
    required this.partnerPoints,
    required this.pairingToken,
    required this.supabaseConfigured,
  });

  final double affinityIndex;
  final int affinityPoints;
  final int userPoints;
  final int partnerPoints;
  final String pairingToken;
  final bool supabaseConfigured;

  @override
  Widget build(BuildContext context) {
    // Lista desplazable para poder mostrar varias tarjetas en pantalla pequeña.
    return ListView(
      padding: const EdgeInsets.all(20),
      children: [
        // Banner superior con el estado de Supabase.
        _HeaderBanner(supabaseConfigured: supabaseConfigured),
        const SizedBox(height: 20),
        // Tarjeta principal con el indicador circular de afinidad.
        Card(
          child: Padding(
            padding: const EdgeInsets.all(20),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Indice de afinidad',
                  style: Theme.of(context).textTheme.titleLarge,
                ),
                const SizedBox(height: 16),
                Center(
                  child: AffinityRing(
                    value: affinityIndex,
                    label: '${affinityIndex.toStringAsFixed(0)}%',
                  ),
                ),
                const SizedBox(height: 16),
                Text(
                  'Affini Points acumulados: $affinityPoints',
                  style: Theme.of(context).textTheme.titleMedium,
                ),
                const SizedBox(height: 12),
                Row(
                  children: [
                    Expanded(
                      child: PointsPill(label: 'Tu cuenta', points: userPoints),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: PointsPill(
                        label: 'Tu pareja',
                        points: partnerPoints,
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),
        const SizedBox(height: 20),
        PairingCard(token: pairingToken),
        const SizedBox(height: 20),
        const DemoTipCard(),
      ],
    );
  }
}

// Banner de bienvenida y estado de integración.
class _HeaderBanner extends StatelessWidget {
  const _HeaderBanner({required this.supabaseConfigured});

  final bool supabaseConfigured;

  @override
  Widget build(BuildContext context) {
    final ColorScheme colorScheme = Theme.of(context).colorScheme;
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(28),
        gradient: LinearGradient(
          colors: [colorScheme.primary, colorScheme.tertiary],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
      ),
      child: Row(
        children: [
          const Icon(Icons.favorite_rounded, color: Colors.white, size: 34),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'AffiniScore demo',
                  style: Theme.of(
                    context,
                  ).textTheme.titleLarge?.copyWith(color: Colors.white),
                ),
                const SizedBox(height: 4),
                Text(
                  supabaseConfigured
                      ? 'Supabase listo para sincronización'
                      : 'Supabase pendiente de credenciales',
                  style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                    color: Colors.white.withValues(alpha: 0.88),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

// Indicador visual circular del índice de afinidad.
class AffinityRing extends StatelessWidget {
  const AffinityRing({super.key, required this.value, required this.label});

  final double value;
  final String label;

  @override
  Widget build(BuildContext context) {
    final ColorScheme colorScheme = Theme.of(context).colorScheme;
    return SizedBox(
      width: 180,
      height: 180,
      child: Stack(
        alignment: Alignment.center,
        children: [
          SizedBox.expand(
            child: CircularProgressIndicator(
              value: value / 100,
              strokeWidth: 14,
              backgroundColor: colorScheme.primary.withValues(alpha: 0.12),
              valueColor: AlwaysStoppedAnimation<Color>(colorScheme.primary),
            ),
          ),
          Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(
                label,
                style: Theme.of(
                  context,
                ).textTheme.displaySmall?.copyWith(fontWeight: FontWeight.w700),
              ),
              const SizedBox(height: 6),
              Text(
                'Indice actual',
                style: Theme.of(context).textTheme.bodyMedium,
              ),
            ],
          ),
        ],
      ),
    );
  }
}

// Pastilla de resumen para mostrar puntos del usuario o la pareja.
class PointsPill extends StatelessWidget {
  const PointsPill({super.key, required this.label, required this.points});

  final String label;
  final int points;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Theme.of(
          context,
        ).colorScheme.surfaceContainerHighest.withValues(alpha: 0.55),
        borderRadius: BorderRadius.circular(20),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(label, style: Theme.of(context).textTheme.labelLarge),
          const SizedBox(height: 6),
          Text(
            '$points',
            style: Theme.of(
              context,
            ).textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.w700),
          ),
        ],
      ),
    );
  }
}

// Tarjeta que muestra el estado de emparejamiento y el token compartible.
class PairingCard extends StatelessWidget {
  const PairingCard({super.key, required this.token});

  final String token;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Emparejamiento',
              style: Theme.of(context).textTheme.titleLarge,
            ),
            const SizedBox(height: 8),
            const Text('Token de invitacion para la pareja'),
            const SizedBox(height: 16),
            Row(
              children: [
                Expanded(child: PseudoQrCard(token: token)),
                const SizedBox(width: 16),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Codigo activo',
                        style: Theme.of(context).textTheme.labelLarge,
                      ),
                      const SizedBox(height: 6),
                      Text(
                        token,
                        style: Theme.of(context).textTheme.displaySmall
                            ?.copyWith(fontWeight: FontWeight.w800),
                      ),
                      const SizedBox(height: 12),
                      const Text(
                        'Compartelo para conectar la cuenta de tu pareja en la nube.',
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

// Cuadrícula visual que simula un código QR usando bloques de color.
class PseudoQrCard extends StatelessWidget {
  const PseudoQrCard({super.key, required this.token});

  final String token;

  @override
  Widget build(BuildContext context) {
    final int seed = token.codeUnits.fold<int>(
      0,
      (int value, int element) => value + element,
    );
    return AspectRatio(
      aspectRatio: 1,
      child: Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: Theme.of(
            context,
          ).colorScheme.surfaceContainerHighest.withValues(alpha: 0.45),
          borderRadius: BorderRadius.circular(20),
        ),
        child: GridView.builder(
          physics: const NeverScrollableScrollPhysics(),
          itemCount: 25,
          gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
            crossAxisCount: 5,
            mainAxisSpacing: 4,
            crossAxisSpacing: 4,
          ),
          itemBuilder: (BuildContext context, int index) {
            final bool filled =
                ((index + seed) % 3 == 0) ||
                index == 0 ||
                index == 4 ||
                index == 20 ||
                index == 24;
            return DecoratedBox(
              decoration: BoxDecoration(
                color: filled
                    ? Theme.of(context).colorScheme.primary
                    : Colors.transparent,
                borderRadius: BorderRadius.circular(4),
              ),
            );
          },
        ),
      ),
    );
  }
}

// Tarjeta informativa para recordar que esta build usa datos de prueba.
class DemoTipCard extends StatelessWidget {
  const DemoTipCard({super.key});

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Demo académica',
              style: Theme.of(context).textTheme.titleMedium,
            ),
            const SizedBox(height: 8),
            const Text(
              'La interfaz usa datos mock mientras se completa la integracion con Supabase y APIs de IA.',
            ),
          ],
        ),
      ),
    );
  }
}

// Hoja inferior que repite el estado de emparejamiento para acceso rápido.
class PairingSheet extends StatelessWidget {
  const PairingSheet({super.key, required this.token});

  final String token;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.only(
        left: 20,
        right: 20,
        top: 8,
        bottom: MediaQuery.of(context).padding.bottom + 20,
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('Emparejamiento', style: Theme.of(context).textTheme.titleLarge),
          const SizedBox(height: 8),
          const Text(
            'Comparte este token o usa el QR simulado para invitar a tu pareja.',
          ),
          const SizedBox(height: 16),
          Center(child: PseudoQrCard(token: token)),
          const SizedBox(height: 16),
          Center(
            child: Text(
              token,
              style: Theme.of(
                context,
              ).textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.w800),
            ),
          ),
        ],
      ),
    );
  }
}

// Pestaña de chat demo con mensajes estáticos.
class ChatPage extends StatelessWidget {
  const ChatPage({super.key, required this.token});

  final String token;

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.all(20),
      children: [
        Card(
          child: Padding(
            padding: const EdgeInsets.all(20),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('Chat', style: Theme.of(context).textTheme.titleLarge),
                const SizedBox(height: 8),
                const Text(
                  'Vista demo para la conversación sincronizada entre miembros de la pareja.',
                ),
                const SizedBox(height: 16),
                const _MessageBubble(
                  text: 'Hola, hoy tenemos 4 retos cortos pendientes.',
                  alignment: Alignment.centerLeft,
                ),
                const SizedBox(height: 10),
                _MessageBubble(
                  text:
                      'Perfecto, reviso el token $token y marcamos uno juntos.',
                  alignment: Alignment.centerRight,
                  isPrimary: true,
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }
}

// Burbuja de mensaje reutilizable para el chat.
class _MessageBubble extends StatelessWidget {
  const _MessageBubble({
    required this.text,
    required this.alignment,
    this.isPrimary = false,
  });

  final String text;
  final Alignment alignment;
  final bool isPrimary;

  @override
  Widget build(BuildContext context) {
    final ColorScheme colorScheme = Theme.of(context).colorScheme;
    return Align(
      alignment: alignment,
      child: Container(
        constraints: const BoxConstraints(maxWidth: 300),
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
        decoration: BoxDecoration(
          color: isPrimary
              ? colorScheme.primary
              : colorScheme.surfaceContainerHighest,
          borderRadius: BorderRadius.circular(18),
        ),
        child: Text(
          text,
          style: TextStyle(color: isPrimary ? Colors.white : null),
        ),
      ),
    );
  }
}

// Pantalla del mapa con un interruptor de privacidad independiente.
class MapPage extends StatelessWidget {
  const MapPage({
    super.key,
    required this.privacyEnabled,
    required this.onPrivacyChanged,
  });

  final bool privacyEnabled;
  final ValueChanged<bool> onPrivacyChanged;

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.all(20),
      children: [
        Card(
          child: Padding(
            padding: const EdgeInsets.all(20),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text('Mapa', style: Theme.of(context).textTheme.titleLarge),
                    Switch(value: privacyEnabled, onChanged: onPrivacyChanged),
                  ],
                ),
                const SizedBox(height: 8),
                const Text(
                  'Interruptor de privacidad para activar o desactivar el GPS de forma independiente.',
                ),
                const SizedBox(height: 16),
                Container(
                  height: 220,
                  width: double.infinity,
                  decoration: BoxDecoration(
                    color: Theme.of(context).colorScheme.surfaceContainerHighest
                        .withValues(alpha: 0.55),
                    borderRadius: BorderRadius.circular(24),
                  ),
                  child: Center(
                    child: privacyEnabled
                        ? Column(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Icon(
                                Icons.location_on_rounded,
                                color: Theme.of(context).colorScheme.primary,
                                size: 44,
                              ),
                              const SizedBox(height: 12),
                              const Text('GPS activo en modo demo'),
                            ],
                          )
                        : const Column(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Icon(Icons.location_off_rounded, size: 44),
                              SizedBox(height: 12),
                              Text('GPS desactivado por privacidad'),
                            ],
                          ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }
}

// Pantalla de retos cortos que suman puntos al completarse.
class ChallengesPage extends StatelessWidget {
  const ChallengesPage({
    super.key,
    required this.challenges,
    required this.onToggleChallenge,
  });

  final List<ChallengeItem> challenges;
  final void Function(int index, bool value) onToggleChallenge;

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.all(20),
      children: [
        Card(
          child: Padding(
            padding: const EdgeInsets.all(20),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Desafíos cortos',
                  style: Theme.of(context).textTheme.titleLarge,
                ),
                const SizedBox(height: 8),
                const Text(
                  'Marca una tarea para sumar puntos al contador compartido.',
                ),
                const SizedBox(height: 16),
                ...List.generate(challenges.length, (int index) {
                  final ChallengeItem challenge = challenges[index];
                  return Padding(
                    padding: EdgeInsets.only(
                      bottom: index == challenges.length - 1 ? 0 : 12,
                    ),
                    child: CheckboxListTile(
                      contentPadding: const EdgeInsets.symmetric(
                        horizontal: 12,
                        vertical: 6,
                      ),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(18),
                      ),
                      value: challenge.completed,
                      onChanged: (bool? value) =>
                          onToggleChallenge(index, value ?? false),
                      title: Text(challenge.title),
                      subtitle: Text('+${challenge.points} puntos'),
                    ),
                  );
                }),
              ],
            ),
          ),
        ),
      ],
    );
  }
}

// Modelo pequeño de una tarea o reto individual.
class ChallengeItem {
  ChallengeItem({
    required this.title,
    required this.points,
    this.completed = false,
  });

  final String title;
  final int points;
  final bool completed;

  ChallengeItem copyWith({String? title, int? points, bool? completed}) {
    return ChallengeItem(
      title: title ?? this.title,
      points: points ?? this.points,
      completed: completed ?? this.completed,
    );
  }
}
