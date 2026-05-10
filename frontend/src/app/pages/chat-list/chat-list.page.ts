import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-chat-list',
  templateUrl: './chat-list.page.html',
  styleUrls: ['./chat-list.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule, RouterModule]
})
export class ChatListPage implements OnInit {

  chats = [
    {
      id: 'partner',
      name: 'Mi Pareja',
      lastMessage: 'Toca para abrir el chat de pareja',
      time: '',
      avatar: 'assets/images/user.png',
      route: '/tabs/chat-partner',
      isAI: false
    },
    {
      id: 'ai',
      name: 'AffiniCoach (IA)',
      lastMessage: 'Tu terapeuta virtual 24/7',
      time: '',
      avatar: 'assets/images/robot.png', // Opcional
      route: '/tabs/chat-ai',
      isAI: true
    }
  ];

  constructor() {}

  ngOnInit() {
  }
}
