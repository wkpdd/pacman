import 'package:flutter/material.dart';
import 'dart:math';

import 'package:pacman/screen.dart';
import 'package:window_manager/window_manager.dart';

void main() async {
  // windowManager.waitUntilReadyToShow().then((value) async {
  //   await windowManager.setSize(const Size(200, 800));
  //   windowManager.show();
  // });

  runApp(const MaterialApp(
    home: PacMan(),
  ));
}

class PacMan extends StatefulWidget {
  const PacMan({Key? key}) : super(key: key);

  @override
  _PacManState createState() => _PacManState();
}

class _PacManState extends State<PacMan> {
  static int _numberOfRows = 11;
  static int _numberOfSquares = _numberOfRows * 16;
  bool still = true;
  int score = 0;
  List <int> eatenFood = [];
  List<int> barriers = [
    0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, //top wall
    11, 22, 33, 44, 55, 66, 77, 88, 99, 110, 121, 132, 143, 154, 165, // l wall
    166, 167, 168, 169, 170, 171, 172, 173, 174, 175, // bottom wall
    164, 153, 142, 131, 120, 109, 98, 87, 76, 65, 54, 43, 32, 21, // r wall
    67, // l box
    75, // r box
    16, 27, 38, // | top
    24, 25, 35, 36, // tl square
    29, 30, 40, 41, //tr square
    58, 69, 80, 81, 82, 83, 84, 73, 62, 61, 59, // middle box
    93, 104, 115, 126, 137, 148, // | middle
    90, 101, 102, 112, 113, // l L
    96, 107, 106, 117, 118, // r L
    134, 135, 146, 145, // bl square
    139, 140, 150, 151 // br square,
  ];

  int squarePos = 159;
  int direction = 0;
  List<int> ghosts = [159, 70, 71, 72];
  List<int> ate = [4,5];
  checkLose(newPos) {
    if (ghosts.getRange(1, 4).contains(newPos)) {
      setState(() {
        still = false;
      });
      Navigator.push(
          context, MaterialPageRoute(builder: (context) => const Faild()));
    }
  }

  int _nextMove() {
    Random rand = Random();
    int nextMove = rand.nextInt(4);
    return nextMove;
  }

  _moveGhost(pos) {
    print([pos, ghosts]);
    int n = _nextMove();
    if (n == 0) {
      setState(() {
        if (pos == 0 && !barriers.contains(ghosts[pos] - 11)) {
          direction = 0;
        }
        if (!barriers.contains(ghosts[pos] - 11))
          {
            ghosts[pos] = ghosts[pos] - 11;
            if( pos == 0 && !eatenFood.contains(ghosts[pos])){
              eatenFood.add(ghosts[pos]);
            }
          }
      });
    } else if (n == 1) {
      setState(() {
        if (pos == 1 && !barriers.contains(ghosts[pos] + 11)) direction = 1;
        if (!barriers.contains(ghosts[pos] + 11)) {
          ghosts[pos] = ghosts[pos] + 11;
          if (pos == 0 && !eatenFood.contains(ghosts[pos])) {
            eatenFood.add(ghosts[pos]);
          }
        }
      });
    } else if (n == 2) {
      setState(() {
        if (pos == 2 && !barriers.contains(ghosts[pos] - 1))  direction = 2;
        if (!barriers.contains(ghosts[pos] - 1)) {
          ghosts[pos] = ghosts[pos] - 1;
          if( pos == 0 && !eatenFood.contains(ghosts[pos])){
            eatenFood.add(ghosts[pos]);
          }
        }
      });
    } else if (n == 3) {
      setState(() {
        if (pos == 3 && !barriers.contains(ghosts[pos] + 1)) direction = 3;
        if (!barriers.contains(ghosts[pos] + 1)) {
          ghosts[pos] = ghosts[pos] + 1;
          if( pos == 0 && !eatenFood.contains(ghosts[pos])){
            eatenFood.add(ghosts[pos]);
          }
        }
      });
    }
    if (pos == 0) checkLose(ghosts[0]);
    Future.delayed(const Duration(milliseconds: 100)).then((value) {
      if (still) _moveGhost(pos);
    });
  }

  @override
  void initState() {
    super.initState();

    _moveGhost(0);
    _moveGhost(1);
    _moveGhost(2);
    _moveGhost(3);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.black,
      body: Column(children: [
        Expanded(
          flex: 5,
          child: SizedBox(
            child: GridView.builder(
                itemCount: _numberOfSquares,
                physics: const NeverScrollableScrollPhysics(),
                gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
                    crossAxisCount: _numberOfRows),
                itemBuilder: (BuildContext context, int index) {
                  if (ghosts[0] == index) {
                    return Pixel(
                        isWall: false,
                        isGhost: false,
                        isFood: false,
                        isPac: true,
                        direction: direction
                    );
                  } else if (ghosts[1] == index) {
                    return Padding(
                      padding: const EdgeInsets.all(8.0),
                      child: Container(
                        color: Colors.green,
                        child: Center(child: Text(index.toString())),
                      ),
                    );
                  } else if (ghosts[2] == index) {
                    return Padding(
                      padding: const EdgeInsets.all(8.0),
                      child: Container(
                        color: Colors.blue,
                        child: Center(child: Text(index.toString())),
                      ),
                    );
                  } else if (ghosts[3] == index) {
                    return Padding(
                      padding: const EdgeInsets.all(8.0),
                      child: Container(
                        color: Colors.pink,
                        child: Center(child: Text(index.toString())),
                      ),
                    );
                  } else {
                    return Pixel(
                        isWall: barriers.contains(index),
                        isGhost: false,
                        isFood: !eatenFood.contains(index),
                        isPac: false);
                  }
                }),
          ),
        ),
        Expanded(
          child: Padding(
            padding: const EdgeInsets.all(8.0),
            child: Container(
                color: Colors.red, child: Center(child: Text("score: ${eatenFood.length}"))),
          ),
        ),
      ]),
    );
  }
}

class Pixel extends StatelessWidget {
  final bool isWall;
  final bool isGhost;
  final bool isFood;
  final bool isPac;
  final int? direction;

  const Pixel(
      {required this.isWall,
      required this.isGhost,
      required this.isFood,
      required this.isPac,
        this.direction,
      Key? key})
      : super(key: key);

  wall() {
    return Padding(
      padding: const EdgeInsets.all(1),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(4),
        child: Container(
          color: Colors.red,
          child: Center(
            child: Container(
              width: 10,
              height: 10,
              decoration: BoxDecoration(
                  color: Colors.redAccent,
                  borderRadius: BorderRadius.circular(5)),
            ),
          ),
        ),
      ),
    );
  }

  static double down = 1.6;
  static double up = -1.6;
  static double backward = -1.6;
  static double forward = 0;

  getDirection(){
    if (direction! == 0) return up;
    if (direction! == 1) return down;
    if (direction! == 2) return backward;
    if (direction! == 3) return forward;
  }

  pac() {
    return Padding(
        padding: const EdgeInsets.all(3),
        child: Transform.rotate(angle: getDirection() , child: Image.asset(
          "assets/imgs/pacman.png",
          width: 10,
          height: 10,

        ),));
  }
  
  food(){
    return  Padding(
      padding: const EdgeInsets.all(1),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(4),
        child: Container(
          color: Colors.black54,
          child: Center(
            child: Container(
              width: 10,
              height: 10,
              decoration: BoxDecoration(
                  color: Colors.yellow,
                  borderRadius: BorderRadius.circular(5)),
            ),
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    if (isWall) return wall();
    if (isPac) return pac();
    if (isFood) return food();
    return Container();
  }
}
